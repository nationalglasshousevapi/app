import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { updateLabourEntrySchema, parseError } from "@/lib/schemas";
import { findOrCreateWorker, syncLabourExpense } from "@/lib/labour";

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

  const parsed = updateLabourEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parseError(parsed.error) },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const sb = supabaseServer();
  const { data: existing, error: fetchError } = await sb
    .from("labour_entries")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError)
    return NextResponse.json(
      { error: "Labour entry not found." },
      { status: 404 }
    );

  const worker =
    input.worker_name !== undefined
      ? await findOrCreateWorker(sb, input.worker_name)
      : null;

  const updates = {
    entry_date: input.entry_date ?? existing.entry_date,
    worker_id: worker?.id ?? existing.worker_id,
    worker_name: worker?.name ?? existing.worker_name,
    work_description:
      input.work_description !== undefined
        ? input.work_description || null
        : existing.work_description,
    amount_owed:
      input.amount_owed !== undefined
        ? input.amount_owed
        : Number(existing.amount_owed),
    amount_paid:
      input.amount_paid !== undefined
        ? input.amount_paid
        : Number(existing.amount_paid),
    payment_mode: input.payment_mode ?? existing.payment_mode,
    reference_number:
      input.reference_number !== undefined
        ? input.reference_number || null
        : existing.reference_number,
    notes: input.notes !== undefined ? input.notes || null : existing.notes,
  };

  if (updates.amount_paid > updates.amount_owed) {
    return NextResponse.json(
      { error: "Paid amount cannot exceed the amount owed." },
      { status: 400 }
    );
  }

  const { data, error } = await sb
    .from("labour_entries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const syncError = await syncLabourExpense(sb, data);
  if (syncError) {
    return NextResponse.json(
      {
        error: `Labour entry saved, but the expense record failed: ${syncError}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ labour: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseServer();
  const { error } = await sb.from("labour_entries").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
