import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { docTypeShort, financialYearFor } from "@/lib/docTypes";
import { parseItems, computeTax, computeTotal, formatItemRows } from "@/lib/documents";
import { createDocumentSchema, parseError } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid save request." }, { status: 400 });
  }

  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parseError(parsed.error) }, { status: 400 });
  }

  const { doc_type, doc_date, items: rawItems, ...rest } = parsed.data;
  const sb = supabaseServer();
  const items = parseItems(rawItems);

  const docDate = doc_date ? new Date(doc_date) : new Date();
  const fy = financialYearFor(docDate);

  // Atomic per-type-per-year numbering, e.g. INV-24-25-0071
  const { data: seqData, error: seqError } = await sb.rpc("next_document_number", {
    p_doc_type: doc_type,
    p_financial_year: fy,
  });
  if (seqError) return NextResponse.json({ error: seqError.message }, { status: 500 });

  const docNumber = `${docTypeShort(doc_type)}-${fy}-${String(seqData).padStart(4, "0")}`;

  const subtotal = items.reduce((sum, it) => sum + (it.qty || 0) * (it.rate || 0), 0);

  const { cgst, sgst, igst } = computeTax(subtotal, rest.tax_type, rest.tax_rate, rest.discount_amount);
  const total = computeTotal(subtotal, cgst, sgst, igst, rest.round_off, rest.discount_amount, rest.transport_charges, rest.packing_forwarding_charges, rest.additional_charges);

  const { data: doc, error: docError } = await sb
    .from("documents")
    .insert({
      doc_type,
      doc_number: docNumber,
      financial_year: fy,
      doc_date: docDate.toISOString().slice(0, 10),
      order_number: rest.order_number || null,
      order_date: rest.order_date || null,
      customer_id: rest.customer_id ?? null,
      bill_to_name: rest.bill_to_name || null,
      bill_to_address: rest.bill_to_address || null,
      bill_to_contact_person: rest.bill_to_contact_person || null,
      bill_to_contact_number: rest.bill_to_contact_number || null,
      bill_to_email: rest.bill_to_email || null,
      bill_to_gst: rest.bill_to_gst || null,
      ship_to_name: rest.ship_to_name || rest.bill_to_name || null,
      ship_to_address: rest.ship_to_address || rest.bill_to_address || null,
      ship_to_contact_person: rest.ship_to_contact_person || null,
      ship_to_contact_number: rest.ship_to_contact_number || null,
      subtotal,
      tax_type: rest.tax_type,
      tax_rate: rest.tax_rate,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      round_off: rest.round_off,
      discount_amount: rest.discount_amount || 0,
      transport_charges: rest.transport_charges || 0,
      packing_forwarding_charges: rest.packing_forwarding_charges || 0,
      additional_charges: rest.additional_charges ?? [],
      total_amount: total,
      remarks: rest.remarks ?? null,
      status: rest.status || "draft",
    })
    .select()
    .single();

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });

  if (items.length) {
    const { error: itemsError } = await sb.from("document_items").insert(formatItemRows(items, doc.id));
    if (itemsError) {
      // Avoid showing a document as saved when its line items did not save.
      await sb.from("documents").delete().eq("id", doc.id);
      return NextResponse.json({ error: `Could not save line items: ${itemsError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ document: doc });
}
