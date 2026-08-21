import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createCustomerSchema, parseError } from "@/lib/schemas";

function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const recent = req.nextUrl.searchParams.get("recent") === "true";
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const pageSizeRaw = parseInt(req.nextUrl.searchParams.get("page_size") ?? "50", 10);
  const pageSize = Math.min(200, Math.max(1, Number.isNaN(pageSizeRaw) ? 50 : pageSizeRaw));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sb = supabaseServer();

  // Fetch balances for all customers in one shot
  const { data: allBalances } = await sb
    .from("customer_ledger_view")
    .select("customer_id, balance_due");
  const balanceMap = new Map<string, number>(
    (allBalances ?? []).map((b) => [b.customer_id, Number(b.balance_due)]),
  );

  let customers: any[] = [];
  let total: number | null = null;

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
    const safeQ = sanitizeSearchTerm(q);
    if (!safeQ) {
      return NextResponse.json({ customers: [], total: 0 });
    }
    const { data, error } = await sb
      .from("customers")
      .select("*")
      .or(
        `name.ilike.%${safeQ}%,contact_number.ilike.%${safeQ}%,gst.ilike.%${safeQ}%,email.ilike.%${safeQ}%`,
      )
      .order("name", { ascending: true });
    if (error) return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    customers = data ?? [];
    total = customers.length;
  } else {
    const { data, error, count } = await sb
      .from("customers")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(from, to);
    if (error) return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    customers = data ?? [];
    total = count ?? customers.length;
  }

  const result = customers.map((c) => ({
    ...c,
    balance_due: balanceMap.get(c.id) ?? 0,
  }));

  return NextResponse.json({ customers: result, total: total ?? result.length });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parseError(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  const sb = supabaseServer();

  const { data, error } = await sb
    .from("customers")
    .insert({
      name: input.name,
      address: input.address || null,
      contact_person: input.contact_person || null,
      contact_number: input.contact_number || null,
      email: input.email || null,
      gst: input.gst || null,
      opening_balance: input.opening_balance,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Could not save customer." }, { status: 500 });
  return NextResponse.json({ customer: data });
}
