import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { docTypeShort, financialYearFor } from "@/lib/docTypes";
import { createPaymentSchema, parseError } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const sb = supabaseServer();
  const customerId = req.nextUrl.searchParams.get("customer_id");
  const fromDate = req.nextUrl.searchParams.get("from_date");
  const toDate = req.nextUrl.searchParams.get("to_date");
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const pageSizeRaw = parseInt(req.nextUrl.searchParams.get("page_size") ?? "50", 10);
  const pageSize = Math.min(200, Math.max(1, Number.isNaN(pageSizeRaw) ? 50 : pageSizeRaw));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = sb
    .from("payments")
    .select("*, customers(name)", { count: "exact" })
    .order("payment_date", { ascending: false })
    .range(from, to);

  if (customerId) query = query.eq("customer_id", customerId);
  if (fromDate) query = query.gte("payment_date", fromDate);
  if (toDate) query = query.lte("payment_date", toDate);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  return NextResponse.json({ payments: data, total: count ?? (data ?? []).length });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parseError(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  const sb = supabaseServer();

  const { data: payment, error } = await sb
    .from("payments")
    .insert({
      customer_id: input.customer_id ?? null,
      payment_date: input.payment_date ?? new Date().toISOString().slice(0, 10),
      amount: input.amount,
      payment_mode: input.payment_mode,
      reference_number: input.reference_number || null,
      document_id: input.document_id ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Could not save payment." }, { status: 500 });

  // Auto-generate receipt if requested
  if (input.generate_receipt && payment) {
    const { data: customer } = await sb
      .from("customers")
      .select("id, name, address, contact_person, contact_number, email, gst")
      .eq("id", input.customer_id)
      .single();

    const paymentDate = input.payment_date ? new Date(input.payment_date) : new Date();
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
          doc_date: input.payment_date ?? new Date().toISOString().slice(0, 10),
          customer_id: input.customer_id ?? null,
          bill_to_name: customer?.name ?? null,
          bill_to_address: customer?.address ?? null,
          bill_to_contact_person: customer?.contact_person ?? null,
          bill_to_contact_number: customer?.contact_number ?? null,
          bill_to_email: customer?.email ?? null,
          bill_to_gst: customer?.gst ?? null,
          subtotal: input.amount,
          total_amount: input.amount,
          tax_type: "none",
          tax_rate: 0,
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
          round_off: 0,
          discount_amount: 0,
          status: "paid",
          remarks: `Payment via ${input.payment_mode}${input.reference_number ? ` (${input.reference_number})` : ""}`,
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
