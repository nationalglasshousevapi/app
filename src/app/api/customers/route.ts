import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const recent = req.nextUrl.searchParams.get("recent") === "true";
  const sb = supabaseServer();

  // Fetch balances for all customers in one shot
  const { data: allBalances } = await sb
    .from("customer_ledger_view")
    .select("customer_id, balance_due");
  const balanceMap = new Map<string, number>(
    (allBalances ?? []).map((b) => [b.customer_id, Number(b.balance_due)]),
  );

  let customers: any[] = [];

  if (!q && recent) {
    // Top 5 most recently invoiced customers
    const { data: recentDocs } = await sb
      .from("documents")
      .select("customer_id")
      .not("customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    const seen = new Set<string>();
    const recentIds: string[] = [];
    for (const doc of recentDocs ?? []) {
      if (!seen.has(doc.customer_id)) {
        seen.add(doc.customer_id);
        recentIds.push(doc.customer_id);
        if (recentIds.length >= 5) break;
      }
    }

    if (recentIds.length > 0) {
      const { data: custData } = await sb
        .from("customers")
        .select("*")
        .in("id", recentIds);

      const orderMap = new Map(recentIds.map((id, i) => [id, i]));
      customers = (custData ?? []).sort(
        (a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99),
      );
    }
  } else if (q) {
    const { data, error } = await sb
      .from("customers")
      .select("*")
      .or(
        `name.ilike.%${q}%,contact_number.ilike.%${q}%,gst.ilike.%${q}%,email.ilike.%${q}%`,
      )
      .order("name", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    customers = data ?? [];
  } else {
    const { data, error } = await sb
      .from("customers")
      .select("*")
      .order("name", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    customers = data ?? [];
  }

  const result = customers.map((c) => ({
    ...c,
    balance_due: balanceMap.get(c.id) ?? 0,
  }));

  return NextResponse.json({ customers: result });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = supabaseServer();

  const { data, error } = await sb
    .from("customers")
    .insert({
      name: body.name,
      address: body.address ?? null,
      contact_person: body.contact_person ?? null,
      contact_number: body.contact_number ?? null,
      email: body.email ?? null,
      gst: body.gst ?? null,
      opening_balance: body.opening_balance ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data });
}
