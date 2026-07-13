import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseServer();
  const { data } = await sb
    .from("customer_ledger_view")
    .select("customer_id, balance_due")
    .order("customer_id");

  return NextResponse.json({ balances: data ?? [] });
}
