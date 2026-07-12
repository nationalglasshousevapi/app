import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { docTypeShort, financialYearFor } from "@/lib/docTypes";

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

  // Generate new document number
  const docDate = new Date();
  const fy = financialYearFor(docDate);

  const { data: seqData, error: seqError } = await sb.rpc("next_document_number", {
    p_doc_type: source.doc_type,
    p_financial_year: fy,
  });

  if (seqError) {
    return NextResponse.json({ error: seqError.message }, { status: 500 });
  }

  const docNumber = `${docTypeShort(source.doc_type)}-${fy}-${String(seqData).padStart(4, "0")}`;

  // Create the duplicated document
  const { data: doc, error: docError } = await sb
    .from("documents")
    .insert({
      doc_type: source.doc_type,
      doc_number: docNumber,
      financial_year: fy,
      doc_date: docDate.toISOString().slice(0, 10),
      order_number: source.order_number,
      order_date: source.order_date,
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
      total_amount: source.total_amount,
      remarks: source.remarks,
      status: "draft",
    })
    .select()
    .single();

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  // Copy line items
  if (sourceItems?.length) {
    const rows = sourceItems.map((it, idx) => ({
      document_id: doc.id,
      position: idx,
      description: it.description,
      size: it.size,
      hsn_code: it.hsn_code,
      qty: it.qty,
      unit: it.unit,
      rate: it.rate,
      total: it.total,
    }));
    const { error: itemsError } = await sb.from("document_items").insert(rows);
    if (itemsError) {
      await sb.from("documents").delete().eq("id", doc.id);
      return NextResponse.json({ error: `Could not copy line items: ${itemsError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ document: doc });
}
