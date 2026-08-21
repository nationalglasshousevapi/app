import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { DocumentServiceError, createDocumentRecord } from "@/lib/documentService";

export async function POST(req: NextRequest) {
  let body: { id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Source document ID is required." }, { status: 400 });
  }

  const sb = supabaseServer();

  // Fetch the source document
  const { data: source, error: sourceError } = await sb
    .from("documents")
    .select("*")
    .eq("id", body.id)
    .single();

  if (sourceError || !source) {
    return NextResponse.json({ error: sourceError?.message ?? "Source document not found" }, { status: 404 });
  }

  // Fetch items
  const { data: sourceItems } = await sb
    .from("document_items")
    .select("*")
    .eq("document_id", body.id)
    .order("position", { ascending: true });

  // Create the duplicated document
  try {
    const { document } = await createDocumentRecord(sb, {
      doc_type: source.doc_type,
      doc_date: new Date(),
      order_number: source.order_number,
      order_date: source.order_date,
      customer_id: source.customer_id,
      bill_to: {
        name: source.bill_to_name,
        address: source.bill_to_address,
        contactPerson: source.bill_to_contact_person,
        contactNumber: source.bill_to_contact_number,
        email: source.bill_to_email,
        gst: source.bill_to_gst,
      },
      ship_to: {
        name: source.ship_to_name,
        address: source.ship_to_address,
        contactPerson: source.ship_to_contact_person,
        contactNumber: source.ship_to_contact_number,
      },
      tax_type: source.tax_type,
      tax_rate: source.tax_rate,
      discount_amount: source.discount_amount || 0,
      additional_charges: source.additional_charges ?? [],
      taxable_charges: source.taxable_charges ?? [],
      remarks: source.remarks,
      status: "draft",
      stored_totals: {
        subtotal: source.subtotal,
        cgst: source.cgst_amount,
        sgst: source.sgst_amount,
        igst: source.igst_amount,
        round_off: source.round_off,
        total_amount: source.total_amount,
      },
      copied_items: sourceItems ?? [],
      items_error_prefix: "Could not copy line items",
    });
    return NextResponse.json({ document });
  } catch (err) {
    const message = err instanceof DocumentServiceError ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
