import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseError, updateCustomerSchema } from "@/lib/schemas";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();
  const { data, error } = await sb.from("customers").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ customer: data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parseError(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.address !== undefined) update.address = input.address || null;
  if (input.contact_person !== undefined) update.contact_person = input.contact_person || null;
  if (input.contact_number !== undefined) update.contact_number = input.contact_number || null;
  if (input.email !== undefined) update.email = input.email || null;
  if (input.gst !== undefined) update.gst = input.gst || null;
  if (input.opening_balance !== undefined) update.opening_balance = input.opening_balance;

  const sb = supabaseServer();

  const { data, error } = await sb
    .from("customers")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Could not save customer." }, { status: 500 });
  return NextResponse.json({ customer: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();
  const { error } = await sb.from("customers").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "Could not delete customer." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
