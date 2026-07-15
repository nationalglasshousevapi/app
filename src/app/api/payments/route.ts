import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { docTypeShort, financialYearFor } from "@/lib/docTypes";

export async function GET(req: NextRequest) {
  const sb = supabaseServer();
  const customerId = req.nextUrl.searchParams.get("customer_id");
  const fromDate = req.nextUrl.searchParams.get("from_date");
  const toDate = req.nextUrl.searchParams.get("to_date");

  let query = sb.from("payments").select("*, customers(name)").order("payment_date", { ascending: false });

  if (customerId) query = query.eq("customer_id", customerId);
  if (fromDate) query = query.gte("payment_date", fromDate);
  if (toDate) query = query.lte("payment_date", toDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payments: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = supabaseServer();

  const { data: payment, error } = await sb
    .from("payments")
    .insert({
      customer_id: body.customer_id,
      payment_date: body.payment_date ?? new Date().toISOString().slice(0, 10),
      amount: body.amount,
      payment_mode: body.payment_mode ?? "cash",
      reference_number: body.reference_number ?? null,
      document_id: body.document_id ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-generate receipt if requested
  if (body.generate_receipt && payment) {
    const { data: customer } = await sb
      .from("customers")
      .select("id, name, address, contact_person, contact_number, email, gst")
      .eq("id", body.customer_id)
      .single();

    const paymentDate = body.payment_date ? new Date(body.payment_date) : new Date();
    const fy = financialYearFor(paymentDate);

    const { data: seqData, error: seqError } = await sb.rpc("next_document_number", {
      p_doc_type: "receipt",
      p_financial_year: fy,
    });

    if (!seqError) {
      const docNumber = `${docTypeShort("receipt")}-${fy}-${String(seqData).padStart(4, "0")}`;

      const { data: receiptDoc } = await sb
        .from("documents")
        .insert({
          doc_type: "receipt",
          doc_number: docNumber,
          financial_year: fy,
          doc_date: body.payment_date ?? new Date().toISOString().slice(0, 10),
          customer_id: body.customer_id,
          bill_to_name: customer?.name ?? null,
          bill_to_address: customer?.address ?? null,
          bill_to_contact_person: customer?.contact_person ?? null,
          bill_to_contact_number: customer?.contact_number ?? null,
          bill_to_email: customer?.email ?? null,
          bill_to_gst: customer?.gst ?? null,
          subtotal: body.amount,
          total_amount: body.amount,
          tax_type: "none",
          tax_rate: 0,
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
          round_off: 0,
          discount_amount: 0,
          transport_charges: 0,
          packing_forwarding_charges: 0,
          status: "paid",
          remarks: `Payment via ${body.payment_mode}${body.reference_number ? ` (${body.reference_number})` : ""}`,
        })
        .select()
        .single();

      if (receiptDoc) {
        // Link payment to receipt
        await sb.from("payments").update({ document_id: receiptDoc.id }).eq("id", payment.id);
      }
    }
  }

  return NextResponse.json({ payment });
}
