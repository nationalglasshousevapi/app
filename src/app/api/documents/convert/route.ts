import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { CONVERTIBLE_TYPES, docTypeShort, financialYearFor } from "@/lib/docTypes";
import { PAYMENT_MODES } from "@/lib/paymentModes";

const validModes = PAYMENT_MODES.map((m) => m.value);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, record_payment, payment_mode } = (body ?? {}) as {
    id?: string;
    record_payment?: boolean;
    payment_mode?: string;
  };
  if (!id) {
    return NextResponse.json({ error: "Source document ID is required." }, { status: 400 });
  }

  const sb = supabaseServer();

  const { data: source, error: sourceError } = await sb
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();
  if (sourceError || !source) {
    return NextResponse.json({ error: sourceError?.message ?? "Source document not found" }, { status: 404 });
  }

  if (!CONVERTIBLE_TYPES.includes(source.doc_type)) {
    return NextResponse.json({ error: "Only quotations, performa invoices and estimates can be converted to an invoice." }, { status: 400 });
  }
  if (source.status === "cancelled") {
    return NextResponse.json({ error: "Cancelled documents cannot be converted." }, { status: 400 });
  }
  if (source.status === "converted") {
    return NextResponse.json({ error: "This document has already been converted to an invoice." }, { status: 400 });
  }

  if (record_payment && payment_mode && !(validModes as string[]).includes(payment_mode)) {
    return NextResponse.json({ error: "Invalid payment mode." }, { status: 400 });
  }

  // Fetch source items
  const { data: sourceItems } = await sb
    .from("document_items")
    .select("*")
    .eq("document_id", id)
    .order("position", { ascending: true });

  // Generate invoice number (atomic)
  const docDate = new Date();
  const fy = financialYearFor(docDate);
  const { data: seqData, error: seqError } = await sb.rpc("next_document_number", {
    p_doc_type: "invoice",
    p_financial_year: fy,
  });
  if (seqError) {
    return NextResponse.json({ error: seqError.message }, { status: 500 });
  }
  const docNumber = `${docTypeShort("invoice")}-${fy}-${String(seqData).padStart(4, "0")}`;

  // Create the invoice, linking the source via order_number
  const { data: invoice, error: invoiceError } = await sb
    .from("documents")
    .insert({
      doc_type: "invoice",
      doc_number: docNumber,
      financial_year: fy,
      doc_date: docDate.toISOString().slice(0, 10),
      order_number: source.doc_number,
      order_date: source.doc_date,
      customer_id: source.customer_id,
      bill_to_name: source.bill_to_name,
      bill_to_address: source.bill_to_address,
      bill_to_contact_person: source.bill_to_contact_person,
      bill_to_contact_number: source.bill_to_contact_number,
      bill_to_email: source.bill_to_email,
      bill_to_gst: source.bill_to_gst,
      ship_to_name: source.ship_to_name,
      ship_to_address: source.ship_to_address,
      ship_to_contact_person: source.ship_to_contact_person,
      ship_to_contact_number: source.ship_to_contact_number,
      subtotal: source.subtotal,
      tax_type: source.tax_type,
      tax_rate: source.tax_rate,
      cgst_amount: source.cgst_amount,
      sgst_amount: source.sgst_amount,
      igst_amount: source.igst_amount,
      round_off: source.round_off,
      discount_amount: source.discount_amount || 0,
      additional_charges: source.additional_charges ?? [],
      taxable_charges: source.taxable_charges ?? [],
      total_amount: source.total_amount,
      remarks: source.remarks,
      status: record_payment ? "paid" : "draft",
    })
    .select()
    .single();

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }

  // Copy line items
  if (sourceItems?.length) {
    const rows = sourceItems.map((it, idx) => ({
      document_id: invoice.id,
      position: idx,
      description: it.description,
      size: it.size,
      hsn_code: it.hsn_code,
      qty: it.qty,
      unit: it.unit,
      rate: it.rate,
      total: it.total,
      actual_length: it.actual_length || 0,
      actual_width: it.actual_width || 0,
      nos: it.nos || 1,
      calculated_length: it.calculated_length || 0,
      calculated_width: it.calculated_width || 0,
      item_type: it.item_type || "glass",
    }));
    const { error: itemsError } = await sb.from("document_items").insert(rows);
    if (itemsError) {
      await sb.from("documents").delete().eq("id", invoice.id);
      return NextResponse.json({ error: `Could not copy line items: ${itemsError.message}` }, { status: 500 });
    }
  }

  // Mark source as converted
  await sb.from("documents").update({ status: "converted" }).eq("id", id);

  // Record payment + generate receipt if requested
  let payment: unknown = null;
  if (record_payment) {
    const amount = Number(source.total_amount);
    const paymentMode = payment_mode ?? "cash";

    // Ensure we have a customer row to attach the payment to (auto-create from
    // the snapshot if the document was created without a linked customer).
    let customerId: string | null = source.customer_id;
    let customer = null;
    if (customerId) {
      const { data: c } = await sb
        .from("customers")
        .select("id, name, address, contact_person, contact_number, email, gst")
        .eq("id", customerId)
        .single();
      customer = c;
    }
    if (!customerId || !customer) {
      const { data: created } = await sb
        .from("customers")
        .insert({
          name: source.bill_to_name || "Cash Customer",
          address: source.bill_to_address ?? null,
          contact_person: source.bill_to_contact_person ?? null,
          contact_number: source.bill_to_contact_number ?? null,
          email: source.bill_to_email ?? null,
          gst: source.bill_to_gst ?? null,
        })
        .select()
        .single();
      customerId = created?.id ?? null;
      customer = created;
      // Keep the new invoice linked to the customer
      if (customerId) {
        await sb.from("documents").update({ customer_id: customerId }).eq("id", invoice.id);
      }
    }

    const { data: paymentRow, error: paymentError } = await sb
      .from("payments")
      .insert({
        customer_id: customerId,
        payment_date: docDate.toISOString().slice(0, 10),
        amount,
        payment_mode: paymentMode,
        reference_number: null,
        document_id: null,
        notes: `Payment for invoice ${docNumber} (converted from ${source.doc_number})`,
      })
      .select()
      .single();
    if (paymentError) {
      return NextResponse.json({ error: `Invoice created but payment could not be recorded: ${paymentError.message}` }, { status: 500 });
    }
    payment = paymentRow;

    // Auto-generate receipt

    const { data: seqData, error: seqError } = await sb.rpc("next_document_number", {
      p_doc_type: "receipt",
      p_financial_year: fy,
    });
    if (!seqError) {
      const receiptNumber = `${docTypeShort("receipt")}-${fy}-${String(seqData).padStart(4, "0")}`;
      const { data: receiptDoc } = await sb
        .from("documents")
        .insert({
          doc_type: "receipt",
          doc_number: receiptNumber,
          financial_year: fy,
          doc_date: docDate.toISOString().slice(0, 10),
          customer_id: customerId,
          bill_to_name: customer?.name ?? source.bill_to_name ?? null,
          bill_to_address: customer?.address ?? null,
          bill_to_contact_person: customer?.contact_person ?? null,
          bill_to_contact_number: customer?.contact_number ?? null,
          bill_to_email: customer?.email ?? null,
          bill_to_gst: customer?.gst ?? null,
          subtotal: amount,
          total_amount: amount,
          tax_type: "none",
          tax_rate: 0,
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
          round_off: 0,
          discount_amount: 0,
          status: "paid",
          remarks: `Payment via ${paymentMode} (${docNumber})`,
        })
        .select()
        .single();

      if (receiptDoc) {
        await sb.from("payments").update({ document_id: receiptDoc.id }).eq("id", paymentRow.id);
      }
    }
  }

  return NextResponse.json({ document: invoice, payment });
}
