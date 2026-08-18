import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: doc, error } = await sb.from("documents").select("id, doc_type").eq("id", id).single();
  if (error || !doc) {
    return NextResponse.json({ error: error?.message ?? "Document not found" }, { status: 404 });
  }

  const { data: items } = await sb
    .from("document_items")
    .select("description, actual_length, actual_width, nos, item_type")
    .eq("document_id", id)
    .order("position", { ascending: true });

  // Map glass items with dimensions to optimizer pieces
  const pieces = (items ?? [])
    .filter((it) => it.item_type !== "charge" && it.actual_length > 0 && it.actual_width > 0)
    .map((it, idx) => ({
      label: String(idx + 1),
      w: Number(it.actual_length),
      h: Number(it.actual_width),
      qty: Number(it.nos || 1),
    }));

  return NextResponse.json({ pieces, docType: doc.doc_type });
}
