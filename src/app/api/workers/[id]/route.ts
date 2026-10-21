import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { updateWorkerSchema, parseError } from "@/lib/schemas";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("workers")
    .select("*")
    .eq("id", id)
    .single();

  if (error)
    return NextResponse.json({ error: "Worker not found." }, { status: 404 });
  return NextResponse.json({ worker: data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = updateWorkerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parseError(parsed.error) },
      { status: 400 }
    );
  }
  const input = parsed.data;
  const sb = supabaseServer();

  const { data: existing, error: fetchError } = await sb
    .from("workers")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError)
    return NextResponse.json({ error: "Worker not found." }, { status: 404 });

  const { data, error } = await sb
    .from("workers")
    .update({
      name: input.name !== undefined ? input.name.trim() : existing.name,
      phone: input.phone !== undefined ? input.phone || null : existing.phone,
      email: input.email !== undefined ? input.email || null : existing.email,
      opening_balance:
        input.opening_balance !== undefined
          ? input.opening_balance
          : Number(existing.opening_balance),
      notes: input.notes !== undefined ? input.notes || null : existing.notes,
    })
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ worker: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseServer();
  const { error } = await sb.from("workers").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
