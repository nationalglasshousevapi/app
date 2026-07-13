import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const sb = supabaseServer();
  const customerId = req.nextUrl.searchParams.get("customer_id");
  const fromDate = req.nextUrl.searchParams.get("from_date");
  const toDate = req.nextUrl.searchParams.get("to_date");

  let query = sb.from("payments").select("*, customers(name)").order("payment_date", { ascending: false });

  if (customerId) query = query.eq("customer_id", customerId);
  if (fromDate) query = query.gte("payment_date", fromDate);
  if (toDate) query = query.lte("payment_date", toDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payments: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = supabaseServer();

  const { data, error } = await sb
    .from("payments")
    .insert({
      customer_id: body.customer_id,
      payment_date: body.payment_date ?? new Date().toISOString().slice(0, 10),
      amount: body.amount,
      payment_mode: body.payment_mode ?? "cash",
      reference_number: body.reference_number ?? null,
      document_id: body.document_id ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payment: data });
}
