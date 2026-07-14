import { supabaseServer } from "@/lib/supabaseServer";
import BackButton from "@/components/BackButton";
import AccountsList from "@/components/accounts/AccountsList";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const sb = supabaseServer();

  // Fetch all customers with their ledger summary from the view
  const { data: customers } = await sb
    .from("customer_ledger_view")
    .select("*")
    .order("balance_due", { ascending: false });

  // Fetch invoice counts per customer
  const { data: invoiceCounts } = await sb
    .from("documents")
    .select("customer_id, id")
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

      <AccountsList customers={combined} />
    </main>
  );
}
