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

  // Invoice counts come straight from customer_ledger_view (see migration
  // 0004). Fall back to 0 if the migration hasn't been applied yet.
  const combined = (customers ?? []).map((c) => ({
    ...c,
    invoice_count: (c as { invoice_count?: number }).invoice_count ?? 0,
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
