import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseItems } from "@/lib/documents";
import { DocumentServiceError, createDocumentRecord } from "@/lib/documentService";
import { createCashSaleSchema, parseError } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createCashSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parseError(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  // A cash sale must be paid immediately — reject credit modes.
  if (input.payment_mode === "adjustment") {
    return NextResponse.json(
      { error: "Cash sales cannot use Adjustment mode." },
      { status: 400 },
    );
  }

  const sb = supabaseServer();
  const items = parseItems(input.items);

  let billToName = input.customer_name?.trim() || "";
  let snap: {
    address: string | null;
    contact_person: string | null;
    contact_number: string | null;
    email: string | null;
    gst: string | null;
  } | null = null;

  if (input.customer_id) {
    const { data: customer } = await sb
      .from("customers")
      .select("name, address, contact_person, contact_number, email, gst")
      .eq("id", input.customer_id)
      .single();
    if (customer) {
      snap = customer;
      billToName = customer.name;
    }
  }
  if (!billToName) billToName = "Walk-in Customer";

  const docDate = input.doc_date ? new Date(input.doc_date) : new Date();

  let document: Record<string, unknown>;
  try {
    ({ document } = await createDocumentRecord(sb, {
      doc_type: "invoice",
      doc_date: docDate,
      customer_id: input.customer_id ?? null,
      bill_to: {
        name: billToName,
        address: snap?.address ?? null,
        contactPerson: snap?.contact_person ?? null,
        contactNumber: snap?.contact_number ?? (input.customer_phone || null),
        email: snap?.email ?? null,
        gst: snap?.gst ?? null,
      },
      ship_to: { name: billToName },
      tax_type: input.tax_type,
      tax_rate: input.tax_type === "none" ? 0 : 0.18,
      discount_amount: input.discount_amount,
      taxable_charges: input.taxable_charges,
      remarks: input.remarks,
      status: "paid",
      items,
    }));
  } catch (err) {
    const message = err instanceof DocumentServiceError ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const total = document.total_amount as number;
  const docNumber = document.doc_number as string;

  const { data: payment, error: paymentError } = await sb
    .from("payments")
    .insert({
      customer_id: input.customer_id ?? null,
      payment_date: docDate.toISOString().slice(0, 10),
      amount: total,
      payment_mode: input.payment_mode,
      reference_number: input.reference_number || null,
      document_id: document.id as string,
      notes: `Cash sale ${docNumber}`,
    })
    .select()
    .single();

  if (paymentError) {
    return NextResponse.json(
      { document, warning: `Invoice saved but payment record failed: ${paymentError.message}` },
      { status: 201 },
    );
  }

  return NextResponse.json({ document, payment }, { status: 201 });
}
