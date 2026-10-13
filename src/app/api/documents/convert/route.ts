import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DocType,
  conversionTargets,
  docTypeShort,
  financialYearFor,
} from "@/lib/docTypes";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import { computeTax, computeTotal } from "@/lib/documents";

const validModes = PAYMENT_MODES.map((m) => m.value);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const {
    id,
    record_payment,
    payment_mode,
    with_gst,
    add_gst,
    gst_type,
    tax_type,
    to_type,
  } = (body ?? {}) as {
    id?: string;
    record_payment?: boolean;
    payment_mode?: string;
    with_gst?: boolean;
    add_gst?: boolean;
    gst_type?: string;
    tax_type?: string;
    to_type?: string;
  };
  if (!id) {
    return NextResponse.json(
      { error: "Source document ID is required." },
      { status: 400 }
    );
  }

  const sb = supabaseServer();

  const { data: source, error: sourceError } = await sb
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();
  if (sourceError || !source) {
    return NextResponse.json(
      { error: sourceError?.message ?? "Source document not found" },
      { status: 404 }
    );
  }

  const targets = conversionTargets(source.doc_type);
  if (targets.length === 0) {
    return NextResponse.json(
      { error: "This document type cannot be converted." },
      { status: 400 }
    );
  }
  if (source.status === "cancelled") {
    return NextResponse.json(
      { error: "Cancelled documents cannot be converted." },
      { status: 400 }
    );
  }
  if (source.status === "converted") {
    return NextResponse.json(
      { error: "This document has already been converted." },
      { status: 400 }
    );
  }

  // Default to invoice (legacy behaviour); otherwise validate the requested target.
  const targetType: DocType = (to_type ?? "invoice") as DocType;
  if (!targets.includes(targetType)) {
    return NextResponse.json(
      {
        error: `This ${source.doc_type} can only be converted to: ${targets.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  const isInvoiceTarget = targetType === "invoice";

  if (
    isInvoiceTarget &&
    record_payment &&
    payment_mode &&
    !(validModes as string[]).includes(payment_mode)
  ) {
    return NextResponse.json(
      { error: "Invalid payment mode." },
      { status: 400 }
    );
  }

  // GST is only added/remapped when producing an invoice. For other targets the
  // tax settings are copied through unchanged.
  const shouldAddGst = isInvoiceTarget && Boolean(with_gst ?? add_gst);
  let docTaxType: string = source.tax_type;
  let docTaxRate: number = Number(source.tax_rate ?? 0);
  const validGstTypes = ["cgst_sgst", "igst", "none"] as const;
  const requestedGstType = (gst_type ?? tax_type) as string | undefined;

  if (
    requestedGstType &&
    !(validGstTypes as readonly string[]).includes(requestedGstType)
  ) {
    return NextResponse.json(
      { error: "Invalid GST type. Use cgst_sgst, igst or none." },
      { status: 400 }
    );
  }

  if (isInvoiceTarget) {
    if (
      requestedGstType &&
      requestedGstType !== "none" &&
      source.tax_type === "none"
    ) {
      docTaxType = requestedGstType;
      docTaxRate = 0.18;
    } else if (shouldAddGst && source.tax_type === "none") {
      docTaxType =
        requestedGstType && requestedGstType !== "none"
          ? requestedGstType
          : "cgst_sgst";
      docTaxRate = 0.18;
    } else if (requestedGstType) {
      docTaxType = requestedGstType;
      docTaxRate = requestedGstType === "none" ? 0 : 0.18;
    }
  }

  // Compute totals — recompute only if tax settings differ from source.
  let docSubtotal = Number(source.subtotal);
  let docDiscount = Number(source.discount_amount ?? 0);
  const docAdditional = (source.additional_charges ?? []) as {
    label: string;
    amount: number;
  }[];
  const docTaxable = (source.taxable_charges ?? []) as {
    label: string;
    amount: number;
  }[];
  let docCgst = Number(source.cgst_amount ?? 0);
  let docSgst = Number(source.sgst_amount ?? 0);
  let docIgst = Number(source.igst_amount ?? 0);
  let docRoundOff = Number(source.round_off ?? 0);
  let docTotal = Number(source.total_amount ?? 0);
  const taxChanged =
    docTaxType !== source.tax_type ||
    docTaxRate !== Number(source.tax_rate ?? 0);
  if (taxChanged) {
    const { cgst, sgst, igst } = computeTax(
      docSubtotal,
      docTaxType,
      docTaxRate,
      docDiscount,
      docTaxable
    );
    const { totalAmount, roundOff } = computeTotal(
      docSubtotal,
      cgst,
      sgst,
      igst,
      docDiscount,
      docAdditional,
      docTaxable
    );
    docCgst = cgst;
    docSgst = sgst;
    docIgst = igst;
    docRoundOff = roundOff;
    docTotal = totalAmount;
  }

  // Fetch source items
  const { data: sourceItems } = await sb
    .from("document_items")
    .select("*")
    .eq("document_id", id)
    .order("position", { ascending: true });

  // Generate document number for the target type (atomic)
  const docDate = new Date();
  const fy = financialYearFor(docDate);
  const { data: seqData, error: seqError } = await sb.rpc(
    "next_document_number",
    {
      p_doc_type: targetType,
      p_financial_year: fy,
    }
  );
  if (seqError) {
    return NextResponse.json({ error: seqError.message }, { status: 500 });
  }
  const docNumber = `${docTypeShort(targetType)}-${fy}-${String(seqData).padStart(4, "0")}`;

  // Create the target document, linking the source via order_number
  const { data: created, error: createdError } = await sb
    .from("documents")
    .insert({
      doc_type: targetType,
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
      subtotal: docSubtotal,
      tax_type: docTaxType,
      tax_rate: docTaxRate,
      cgst_amount: docCgst,
      sgst_amount: docSgst,
      igst_amount: docIgst,
      round_off: docRoundOff,
      discount_amount: docDiscount || 0,
      additional_charges: docAdditional ?? [],
      taxable_charges: docTaxable ?? [],
      total_amount: docTotal,
      remarks: source.remarks,
      status: isInvoiceTarget && record_payment ? "paid" : "draft",
    })
    .select()
    .single();

  if (createdError) {
    return NextResponse.json({ error: createdError.message }, { status: 500 });
  }

  // Copy line items
  if (sourceItems?.length) {
    const rows = sourceItems.map((it, idx) => ({
      document_id: created.id,
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
      await sb.from("documents").delete().eq("id", created.id);
      return NextResponse.json(
        { error: `Could not copy line items: ${itemsError.message}` },
        { status: 500 }
      );
    }
  }

  // Mark source as converted
  await sb.from("documents").update({ status: "converted" }).eq("id", id);

  // Payment + receipt only apply when converting to an invoice.
  let payment: unknown = null;
  const shouldRecordPayment = isInvoiceTarget && Boolean(record_payment);
  if (shouldRecordPayment) {
    // If the source order already collected an advance, only the remaining
    // balance is paid now (the advance payment row already exists). Source
    // documents don't store a paid-total column, so sum the linked payments.
    // Use the invoice total (which may include newly added GST) for balance.
    const { data: paidRows } = await sb
      .from("payments")
      .select("amount")
      .eq("document_id", id);
    const paidSoFar = (paidRows ?? []).reduce(
      (s, p) => s + Number(p.amount),
      0
    );
    const amount = Math.max(0, docTotal - paidSoFar);
    const paymentMode = payment_mode ?? "cash";
    if (amount <= 0) {
      return NextResponse.json(
        {
          document: created,
          payment: null,
          message:
            "This order is already fully paid. Invoice created without a new payment.",
        },
        { status: 201 }
      );
    }

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
      const { data: createdCustomer } = await sb
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
      customerId = createdCustomer?.id ?? null;
      customer = createdCustomer;
      // Keep the new invoice linked to the customer
      if (customerId) {
        await sb
          .from("documents")
          .update({ customer_id: customerId })
          .eq("id", created.id);
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
      return NextResponse.json(
        {
          error: `Invoice created but payment could not be recorded: ${paymentError.message}`,
        },
        { status: 500 }
      );
    }
    payment = paymentRow;

    // Auto-generate receipt
    const { data: receiptSeq, error: receiptSeqError } = await sb.rpc(
      "next_document_number",
      {
        p_doc_type: "receipt",
        p_financial_year: fy,
      }
    );
    if (!receiptSeqError) {
      const receiptNumber = `${docTypeShort("receipt")}-${fy}-${String(receiptSeq).padStart(4, "0")}`;
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
        await sb
          .from("payments")
          .update({ document_id: receiptDoc.id })
          .eq("id", paymentRow.id);
      }
    }
  }

  return NextResponse.json({ document: created, payment });
}
