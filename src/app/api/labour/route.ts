import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createLabourEntrySchema, parseError } from "@/lib/schemas";
import { findOrCreateWorker, syncLabourExpense } from "@/lib/labour";

export async function GET(req: NextRequest) {
  const sb = supabaseServer();
  const fromDate = req.nextUrl.searchParams.get("from_date");
  const toDate = req.nextUrl.searchParams.get("to_date");

  let query = sb
    .from("labour_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (fromDate) query = query.gte("entry_date", fromDate);
  if (toDate) query = query.lte("entry_date", toDate);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ labour: data });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createLabourEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parseError(parsed.error) },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const sb = supabaseServer();
  const worker = await findOrCreateWorker(sb, input.worker_name);
  const { data, error } = await sb
    .from("labour_entries")
    .insert({
      entry_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
      worker_id: worker?.id ?? null,
      worker_name: worker?.name ?? input.worker_name.trim(),
      work_description: input.work_description || null,
      amount_owed: input.amount_owed,
      amount_paid: input.amount_paid,
      payment_mode: input.payment_mode,
      reference_number: input.reference_number || null,
      notes: input.notes || null,
    })
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

  return NextResponse.json({ labour: data }, { status: 201 });
}
