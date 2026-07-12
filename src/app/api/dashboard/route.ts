import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseServer();

  // Only 'invoice' documents count as revenue.
  const { data: invoices, error } = await sb
    .from("documents")
    .select("doc_date, total_amount, customer_id, bill_to_name, doc_type")
    .eq("doc_type", "invoice");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const monthly = new Map<string, number>();
  const byCustomer = new Map<string, { name: string; total: number; count: number }>();
  let totalRevenue = 0;

  for (const inv of invoices ?? []) {
    const month = String(inv.doc_date).slice(0, 7); // "YYYY-MM"
    monthly.set(month, (monthly.get(month) ?? 0) + Number(inv.total_amount));
    totalRevenue += Number(inv.total_amount);

    const key = inv.customer_id ?? inv.bill_to_name ?? "unknown";
    const existing = byCustomer.get(key) ?? { name: inv.bill_to_name ?? "Unknown", total: 0, count: 0 };
    existing.total += Number(inv.total_amount);
    existing.count += 1;
    byCustomer.set(key, existing);
  }

  const monthlySeries = Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));

  const topCustomers = Array.from(byCustomer.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const { count: customerCount } = await sb
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { data: docCounts } = await sb
    .from("documents")
    .select("doc_type");

  const countsByType: Record<string, number> = {};
  for (const d of docCounts ?? []) {
    countsByType[d.doc_type] = (countsByType[d.doc_type] ?? 0) + 1;
  }

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthRevenue = monthly.get(thisMonth) ?? 0;

  return NextResponse.json({
    totalRevenue,
    thisMonthRevenue,
    invoiceCount: invoices?.length ?? 0,
    customerCount: customerCount ?? 0,
    monthlySeries,
    topCustomers,
    countsByType,
  });
}
