import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { docTypeShort, financialYearFor } from "@/lib/docTypes";

export async function GET(req: NextRequest) {
  const sb = supabaseServer();
  const type = req.nextUrl.searchParams.get("type");
  const customerId = req.nextUrl.searchParams.get("customer_id");
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "100");

  let query = sb
    .from("documents")
    .select("*")
    .order("doc_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type) query = query.eq("doc_type", type);
  if (customerId) query = query.eq("customer_id", customerId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid save request." }, { status: 400 });
  }
  const sb = supabaseServer();

  if (typeof body.doc_type !== "string" || !body.doc_type) {
    return NextResponse.json({ error: "Choose a document type." }, { status: 400 });
  }
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

  const docDate: Date = body.doc_date ? new Date(body.doc_date) : new Date();
  const fy = financialYearFor(docDate);

  // Atomic per-type-per-year numbering, e.g. INV-24-25-0071
  const { data: seqData, error: seqError } = await sb.rpc("next_document_number", {
    p_doc_type: body.doc_type,
    p_financial_year: fy,
  });
  if (seqError) return NextResponse.json({ error: seqError.message }, { status: 500 });

  const docNumber = `${docTypeShort(body.doc_type)}-${fy}-${String(seqData).padStart(4, "0")}`;

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
    .insert({
      doc_type: body.doc_type,
      doc_number: docNumber,
      financial_year: fy,
      doc_date: docDate.toISOString().slice(0, 10),
      order_number: body.order_number ?? null,
      order_date: body.order_date ?? null,
      customer_id: body.customer_id ?? null,
      bill_to_name: body.bill_to_name ?? null,
      bill_to_address: body.bill_to_address ?? null,
      bill_to_contact_person: body.bill_to_contact_person ?? null,
      bill_to_contact_number: body.bill_to_contact_number ?? null,
      bill_to_email: body.bill_to_email ?? null,
      bill_to_gst: body.bill_to_gst ?? null,
      ship_to_name: body.ship_to_name ?? body.bill_to_name ?? null,
      ship_to_address: body.ship_to_address ?? body.bill_to_address ?? null,
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
    .select()
    .single();

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });

  if (items.length) {
    const rows = items.map((it, idx) => ({
      document_id: doc.id,
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
    if (itemsError) {
      // Avoid showing a document as saved when its line items did not save.
      await sb.from("documents").delete().eq("id", doc.id);
      return NextResponse.json({ error: `Could not save line items: ${itemsError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ document: doc });
}
