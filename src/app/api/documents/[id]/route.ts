import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseItems, computeTax, computeTotal, formatItemRows } from "@/lib/documents";
import { updateDocumentSchema, parseError } from "@/lib/schemas";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();

  const { data: doc, error } = await sb
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: items, error: itemsError } = await sb
    .from("document_items")
    .select("*")
    .eq("document_id", params.id)
    .order("position", { ascending: true });
  if (itemsError)
    return NextResponse.json({ error: itemsError.message }, { status: 500 });

  return NextResponse.json({ document: doc, items });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid save request." }, { status: 400 });
  }

  const parsed = updateDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parseError(parsed.error) }, { status: 400 });
  }

  const { items: rawItems, ...rest } = parsed.data;
  const sb = supabaseServer();
  const items = parseItems(rawItems);

  const subtotal = items.reduce((sum, it) => sum + (it.qty || 0) * (it.rate || 0), 0);

  const { cgst, sgst, igst } = computeTax(subtotal, rest.tax_type, rest.tax_rate, rest.discount_amount);
  const total = computeTotal(subtotal, cgst, sgst, igst, rest.round_off, rest.discount_amount, rest.transport_charges, rest.packing_forwarding_charges);

  const { data: doc, error: docError } = await sb
    .from("documents")
    .update({
      doc_date: rest.doc_date,
      order_number: rest.order_number || null,
      order_date: rest.order_date || null,
      customer_id: rest.customer_id ?? null,
      bill_to_name: rest.bill_to_name || null,
      bill_to_address: rest.bill_to_address || null,
      bill_to_contact_person: rest.bill_to_contact_person || null,
      bill_to_contact_number: rest.bill_to_contact_number || null,
      bill_to_email: rest.bill_to_email || null,
      bill_to_gst: rest.bill_to_gst || null,
      ship_to_name: rest.ship_to_name || null,
      ship_to_address: rest.ship_to_address || null,
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
      total_amount: total,
      remarks: rest.remarks ?? null,
      status: rest.status || "draft",
    })
    .eq("id", params.id)
    .select()
    .single();

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });

  // Simplest safe strategy: replace all line items on every save.
  const { error: deleteItemsError } = await sb.from("document_items").delete().eq("document_id", params.id);
  if (deleteItemsError) {
    return NextResponse.json({ error: `Could not update line items: ${deleteItemsError.message}` }, { status: 500 });
  }
  if (items.length) {
    const { error: itemsError } = await sb.from("document_items").insert(formatItemRows(items, params.id));
    if (itemsError)
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ document: doc });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();
  const { error } = await sb.from("documents").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
