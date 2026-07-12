import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

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
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid save request." }, { status: 400 });
  }
  const sb = supabaseServer();

  if (typeof body.bill_to_name !== "string" || !body.bill_to_name.trim()) {
    return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items: Array<{
    description: string;
    size?: string;
    hsn_code?: string;
    qty: number;
    unit?: string;
    rate: number;
  }> = rawItems.map((item: unknown) => {
    const row = item as Record<string, unknown>;
    return {
      description: String(row.description ?? "").trim(),
      size: String(row.size ?? "").trim(),
      hsn_code: String(row.hsn_code ?? "").trim(),
      qty: Number(row.qty),
      unit: String(row.unit ?? "sq.ft").trim() || "sq.ft",
      rate: Number(row.rate),
    };
  });
  if (!items.length || items.some((it) => !it.description || !Number.isFinite(it.qty) || it.qty <= 0 || !Number.isFinite(it.rate) || it.rate < 0)) {
    return NextResponse.json({ error: "Add at least one complete line item (description, quantity and rate)." }, { status: 400 });
  }

  const subtotal = items.reduce((sum, it) => sum + (it.qty || 0) * (it.rate || 0), 0);

  let cgst = 0,
    sgst = 0,
    igst = 0;
  const taxType = body.tax_type ?? "cgst_sgst";
  const taxRate = Number(body.tax_rate ?? 0.18);
  if (taxType === "cgst_sgst") {
    cgst = Math.round(((subtotal * taxRate) / 2) * 100) / 100;
    sgst = cgst;
  } else if (taxType === "igst") {
    igst = Math.round(subtotal * taxRate * 100) / 100;
  }
  const roundOff = Number(body.round_off ?? 0);
  const total = Math.round((subtotal + cgst + sgst + igst + roundOff) * 100) / 100;

  const { data: doc, error: docError } = await sb
    .from("documents")
    .update({
      doc_date: body.doc_date,
      order_number: body.order_number ?? null,
      order_date: body.order_date ?? null,
      customer_id: body.customer_id ?? null,
      bill_to_name: body.bill_to_name ?? null,
      bill_to_address: body.bill_to_address ?? null,
      bill_to_contact_person: body.bill_to_contact_person ?? null,
      bill_to_contact_number: body.bill_to_contact_number ?? null,
      bill_to_email: body.bill_to_email ?? null,
      bill_to_gst: body.bill_to_gst ?? null,
      ship_to_name: body.ship_to_name ?? null,
      ship_to_address: body.ship_to_address ?? null,
      ship_to_contact_person: body.ship_to_contact_person ?? null,
      ship_to_contact_number: body.ship_to_contact_number ?? null,
      subtotal,
      tax_type: taxType,
      tax_rate: taxRate,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      round_off: roundOff,
      total_amount: total,
      remarks: body.remarks ?? null,
      status: body.status ?? "draft",
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
    const rows = items.map((it, idx) => ({
      document_id: params.id,
      position: idx,
      description: it.description,
      size: it.size || null,
      hsn_code: it.hsn_code ?? null,
      qty: it.qty,
      unit: it.unit ?? "sq.ft",
      rate: it.rate,
      total: Math.round((it.qty || 0) * (it.rate || 0) * 100) / 100,
    }));
    const { error: itemsError } = await sb.from("document_items").insert(rows);
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
