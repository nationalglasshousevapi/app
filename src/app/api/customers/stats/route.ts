import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseServer();

  const { data, error } = await sb
    .from("documents")
    .select("customer_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count invoices per customer
  const counts: Record<string, number> = {};
  for (const doc of data ?? []) {
    if (doc.customer_id) {
      counts[doc.customer_id] = (counts[doc.customer_id] ?? 0) + 1;
    }
  }

  return NextResponse.json({ counts });
}
