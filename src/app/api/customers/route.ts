import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const sb = supabaseServer();

  let query = sb.from("customers").select("*").order("name", { ascending: true });
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = supabaseServer();

  const { data, error } = await sb
    .from("customers")
    .insert({
      name: body.name,
      address: body.address ?? null,
      contact_person: body.contact_person ?? null,
      contact_number: body.contact_number ?? null,
      email: body.email ?? null,
      gst: body.gst ?? null,
      opening_balance: body.opening_balance ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data });
}
