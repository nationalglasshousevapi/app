import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseItems } from "@/lib/documents";
import { DocumentServiceError, createDocumentRecord } from "@/lib/documentService";

// Reuse the document schema shape for purchases (supplier snapshotted into bill_to_*)
import { createDocumentSchema, parseError } from "@/lib/schemas";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const sb = supabaseServer();
  const q = req.nextUrl.searchParams.get("q");
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let countQuery = sb.from("documents").select("*", { count: "exact", head: true }).eq("doc_type", "purchase");
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    countQuery = countQuery.or(`doc_number.ilike.${term},bill_to_name.ilike.${term}`);
  }
  const { count: totalCount } = await countQuery;

  let query = sb
    .from("documents")
    .select("id, doc_type, doc_number, doc_date, bill_to_name, bill_to_contact_number, total_amount, status, customer_id")
    .eq("doc_type", "purchase")
    .order("doc_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(`doc_number.ilike.${term},bill_to_name.ilike.${term}`);
  }

  const { data: purchases } = await query;

  return NextResponse.json({ purchases: purchases ?? [], total: totalCount ?? 0, page, pageSize: PAGE_SIZE });
}

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
  if (parsed.data.doc_type !== "purchase") {
    return NextResponse.json({ error: "doc_type must be 'purchase'" }, { status: 400 });
  }

  const { doc_type, doc_number: userDocNumber, doc_date, items: rawItems, ...rest } = parsed.data;
  const sb = supabaseServer();

  try {
    const { document } = await createDocumentRecord(sb, {
      doc_type,
      doc_number: userDocNumber || undefined,
      doc_date: doc_date ? new Date(doc_date) : new Date(),
      order_number: rest.order_number,
      order_date: rest.order_date,
      customer_id: rest.customer_id,
      bill_to: {
        name: rest.bill_to_name,
        address: rest.bill_to_address,
        contactPerson: rest.bill_to_contact_person,
        contactNumber: rest.bill_to_contact_number,
        email: rest.bill_to_email,
        gst: rest.bill_to_gst,
      },
      ship_to: {
        name: rest.ship_to_name || rest.bill_to_name,
        address: rest.ship_to_address || rest.bill_to_address,
        contactPerson: rest.ship_to_contact_person,
        contactNumber: rest.ship_to_contact_number,
      },
      tax_type: rest.tax_type,
      tax_rate: rest.tax_rate,
      discount_amount: rest.discount_amount,
      additional_charges: rest.additional_charges,
      taxable_charges: rest.taxable_charges,
      remarks: rest.remarks,
      status: rest.status,
      items: parseItems(rawItems),
    });
    return NextResponse.json({ document });
  } catch (err) {
    const message = err instanceof DocumentServiceError ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
