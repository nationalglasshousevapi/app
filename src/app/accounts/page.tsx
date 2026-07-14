import { supabaseServer } from "@/lib/supabaseServer";
import { inr } from "@/lib/format";
import Link from "next/link";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const sb = supabaseServer();

  // Fetch all customers with their ledger summary from the view
  const { data: customers } = await sb
    .from("customer_ledger_view")
    .select("*")
    .order("balance_due", { ascending: false });

  const totalReceivable = (customers ?? []).reduce((s, c) => s + Number(c.balance_due), 0);
  const totalInvoiced = (customers ?? []).reduce((s, c) => s + Number(c.total_invoiced), 0);
  const totalPaid = (customers ?? []).reduce((s, c) => s + Number(c.total_paid), 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      <h1 className="font-display text-2xl font-bold text-ink">Accounts</h1>

      {/* Summary stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm font-semibold text-slate-500">Total Receivable</div>
          <div className="font-display text-2xl font-bold text-ink mt-1">{inr(totalReceivable)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold text-slate-500">Total Invoiced</div>
          <div className="font-display text-2xl font-bold text-ink mt-1">{inr(totalInvoiced)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold text-slate-500">Total Paid</div>
          <div className="font-display text-2xl font-bold text-ink mt-1">{inr(totalPaid)}</div>
        </div>
      </div>

      {/* Customer accounts table */}
      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th scope="col" className="pb-2 font-semibold">Customer</th>
              <th scope="col" className="pb-2 font-semibold text-right">Opening</th>
              <th scope="col" className="pb-2 font-semibold text-right">Invoiced</th>
              <th scope="col" className="pb-2 font-semibold text-right">Paid</th>
              <th scope="col" className="pb-2 font-semibold text-right">Balance Due</th>
            </tr>
          </thead>
          <tbody>
            {customers?.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">No customers found.</td>
              </tr>
            ) : (
              (customers ?? []).map((c) => {
                const bd = Number(c.balance_due);
                const statusColor = bd <= 0 ? "text-green-600" : bd > Number(c.total_invoiced) * 0.5 ? "text-red-600" : "text-amber-600";
                return (
                  <tr key={c.customer_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4">
                      <Link href={`/accounts/${c.customer_id}`} className="text-brand-600 hover:underline font-semibold">
                        {c.customer_name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">{inr(Number(c.opening_balance))}</td>
                    <td className="py-2 pr-4 text-right font-mono">{inr(Number(c.total_invoiced))}</td>
                    <td className="py-2 pr-4 text-right font-mono">{inr(Number(c.total_paid))}</td>
                    <td className={`py-2 text-right font-mono font-semibold ${statusColor}`}>{inr(bd)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
