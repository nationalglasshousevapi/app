import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseError, updatePaymentSchema } from "@/lib/schemas";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();
  const { data, error } = await sb.from("payments").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ payment: data });
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

  const parsed = updatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parseError(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  const sb = supabaseServer();

  const update: Record<string, unknown> = {};
  if (input.payment_date !== undefined) update.payment_date = input.payment_date;
  if (input.amount !== undefined) update.amount = input.amount;
  if (input.payment_mode !== undefined) update.payment_mode = input.payment_mode;
  if (input.reference_number !== undefined) update.reference_number = input.reference_number || null;
  if (input.notes !== undefined) update.notes = input.notes ?? null;

  const { data, error } = await sb
    .from("payments")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Could not save payment." }, { status: 500 });
  return NextResponse.json({ payment: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();
  const { error } = await sb.from("payments").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "Could not delete payment." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
