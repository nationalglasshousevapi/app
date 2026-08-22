import { supabaseServer } from "@/lib/supabaseServer";
import BackButton from "@/components/BackButton";
import AccountsList from "@/components/accounts/AccountsList";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const sb = supabaseServer();

  // Fetch all customers with their ledger summary from the view
  const { data: customers } = await sb
    .from("customer_ledger_view")
    .select("*")
    .order("balance_due", { ascending: false });

  // Fetch invoice counts per customer (select only the FK column to keep
  // the payload minimal — no full rows are pulled to the client/server)
  const { data: invoiceCounts } = await sb
    .from("documents")
    .select("customer_id")
    .eq("doc_type", "invoice")
    .neq("status", "cancelled");

  const countMap: Record<string, number> = {};
  for (const row of invoiceCounts ?? []) {
    countMap[row.customer_id] = (countMap[row.customer_id] ?? 0) + 1;
  }

  const combined = (customers ?? []).map((c) => ({
    ...c,
    invoice_count: countMap[c.customer_id] ?? 0,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      <h1 className="font-display text-2xl font-bold text-ink">Accounts</h1>

      <div className="grid grid-cols-2 gap-3 mt-4 mb-6">
        <Link href="/expenses" className="card p-4 hover:border-brand-300 transition">
          <p className="font-semibold text-sm text-ink">Expenses</p>
          <p className="text-xs text-slate-400">Shop spending &amp; bills</p>
        </Link>
        <Link href="/daybook" className="card p-4 hover:border-brand-300 transition">
          <p className="font-semibold text-sm text-ink">Day book</p>
          <p className="text-xs text-slate-400">Today&apos;s money in &amp; out</p>
        </Link>
      </div>

      <AccountsList customers={combined} />
    </main>
  );
}
