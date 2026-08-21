import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { updateExpenseSchema, parseError } from "@/lib/schemas";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = updateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parseError(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  const updates: Record<string, unknown> = {};
  if (input.expense_date !== undefined) updates.expense_date = input.expense_date;
  if (input.category !== undefined) updates.category = input.category;
  if (input.description !== undefined) updates.description = input.description || null;
  if (input.amount !== undefined) updates.amount = input.amount;
  if (input.payment_mode !== undefined) updates.payment_mode = input.payment_mode;
  if (input.reference_number !== undefined) updates.reference_number = input.reference_number || null;

  const sb = supabaseServer();
  const { data, error } = await sb.from("expenses").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expense: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = supabaseServer();
  const { error } = await sb.from("expenses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
