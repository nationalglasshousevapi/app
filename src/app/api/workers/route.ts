import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createWorkerSchema, parseError } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const sb = supabaseServer();

  let query = sb.from("workers").select("*").order("name", { ascending: true });
  if (q) query = query.ilike("name", `%${q.replace(/[,()]/g, " ")}%`);

  const [{ data: workers, error }, { data: labour }] = await Promise.all([
    query,
    sb.from("labour_entries").select("worker_id, amount_owed, amount_paid"),
  ]);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const totals = new Map<string, { owed: number; paid: number }>();
  for (const row of labour ?? []) {
    if (!row.worker_id) continue;
    const t = totals.get(row.worker_id) ?? { owed: 0, paid: 0 };
    t.owed += Number(row.amount_owed);
    t.paid += Number(row.amount_paid);
    totals.set(row.worker_id, t);
  }

  const result = (workers ?? []).map((w) => {
    const t = totals.get(w.id) ?? { owed: 0, paid: 0 };
    return {
      ...w,
      total_owed: t.owed,
      total_paid: t.paid,
      balance_owed: Number(w.opening_balance) + t.owed - t.paid,
    };
  });

  return NextResponse.json({ workers: result });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createWorkerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parseError(parsed.error) },
      { status: 400 }
    );
  }
  const input = parsed.data;
  const sb = supabaseServer();

  const { data, error } = await sb
    .from("workers")
    .insert({
      name: input.name.trim(),
      phone: input.phone || null,
      email: input.email || null,
      opening_balance: input.opening_balance,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ worker: data }, { status: 201 });
}
