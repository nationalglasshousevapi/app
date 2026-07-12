import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ customer: data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const sb = supabaseServer();

  const { data, error } = await sb
    .from("customers")
    .update({
      name: body.name,
      address: body.address ?? null,
      contact_person: body.contact_person ?? null,
      contact_number: body.contact_number ?? null,
      email: body.email ?? null,
      gst: body.gst ?? null,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();
  const { error } = await sb.from("customers").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
