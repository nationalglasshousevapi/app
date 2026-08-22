import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupplierSchema, parseError } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const sb = supabaseServer();
  const q = req.nextUrl.searchParams.get("q");
  const recent = req.nextUrl.searchParams.get("recent");

  let query = sb
    .from("suppliers")
    .select("id, name, address, contact_person, contact_number, email, gst")
    .order("name", { ascending: true })
    .limit(20);

  if (recent) {
    query = sb
      .from("suppliers")
      .select("id, name, address, contact_person, contact_number, email, gst")
      .order("updated_at", { ascending: false })
      .limit(8);
  } else if (q?.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(`name.ilike.${term},gst.ilike.${term}`);
  }

  const { data: suppliers } = await query;
  return NextResponse.json({ suppliers: suppliers ?? [] });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createSupplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parseError(parsed.error) }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: supplier, error } = await sb
    .from("suppliers")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ supplier }, { status: 201 });
}
