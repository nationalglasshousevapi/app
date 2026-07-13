import { supabaseServer } from "@/lib/supabaseServer";
import { inr } from "@/lib/format";
import LedgerTable from "@/components/accounts/LedgerTable";
import PaymentForm from "@/components/accounts/PaymentForm";

export const dynamic = "force-dynamic";

export default async function CustomerLedgerPage({
  params,
}: {
  params: { customerId: string };
}) {
  const sb = supabaseServer();
  const { customerId } = params;

  // Fetch customer
  const { data: customer } = await sb
    .from("customers")
    .select("name, opening_balance")
    .eq("id", customerId)
    .single();

  if (!customer) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-slate-500">Customer not found.</p>
      </main>
    );
  }

  // Fetch invoices
  const { data: invoices } = await sb
    .from("documents")
    .select("id, doc_date, doc_number, total_amount")
    .eq("customer_id", customerId)
    .eq("doc_type", "invoice")
    .neq("status", "cancelled")
    .order("doc_date", { ascending: true });

  // Fetch payments
  const { data: payments } = await sb
    .from("payments")
    .select("id, payment_date, amount, payment_mode, reference_number, notes")
    .eq("customer_id", customerId)
    .order("payment_date", { ascending: true });

  // Build ledger entries
  const entries: {
    date: string;
    type: "opening" | "invoice" | "payment";
    description: string;
    debit: number;
    credit: number;
    balance: number;
    refId?: string;
  }[] = [];

  let runningBalance = Number(customer.opening_balance);

  if (runningBalance > 0) {
    entries.push({
      date: "",
      type: "opening",
      description: "Opening Balance",
      debit: runningBalance,
      credit: 0,
      balance: runningBalance,
    });
  }

  let i = 0;
  let j = 0;
  while (i < (invoices?.length ?? 0) || j < (payments?.length ?? 0)) {
    const invDate = invoices?.[i]?.doc_date ?? "9999-12-31";
    const payDate = payments?.[j]?.payment_date ?? "9999-12-31";

    if (invDate <= payDate && invoices?.[i]) {
      const inv = invoices[i];
      const amount = Number(inv.total_amount);
      runningBalance += amount;
      entries.push({
        date: inv.doc_date,
        type: "invoice",
        description: inv.doc_number,
        debit: amount,
        credit: 0,
        balance: runningBalance,
        refId: inv.id,
      });
      i++;
    } else if (payments?.[j]) {
      const pay = payments[j];
      const amount = Number(pay.amount);
      runningBalance -= amount;
      entries.push({
        date: pay.payment_date,
        type: "payment",
        description: `${pay.payment_mode}${pay.reference_number ? ` (${pay.reference_number})` : ""}`,
        debit: 0,
        credit: amount,
        balance: runningBalance,
        refId: pay.id,
      });
      j++;
    } else {
      break;
    }
  }

  const totalInvoiced = (invoices ?? []).reduce((s, inv) => s + Number(inv.total_amount), 0);
  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Back link */}
      <a href="/accounts" className="text-sm text-brand-600 hover:underline">&larr; Back to Accounts</a>

      {/* Customer header */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{customer.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Customer Ledger</p>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="card p-3 text-center min-w-[100px]">
            <div className="text-slate-500 text-xs font-semibold">Invoiced</div>
            <div className="font-display font-bold text-ink mt-1">{inr(totalInvoiced)}</div>
          </div>
          <div className="card p-3 text-center min-w-[100px]">
            <div className="text-slate-500 text-xs font-semibold">Paid</div>
            <div className="font-display font-bold text-ink mt-1">{inr(totalPaid)}</div>
          </div>
          <div className="card p-3 text-center min-w-[100px]">
            <div className="text-slate-500 text-xs font-semibold">Balance</div>
            <div className={`font-display font-bold mt-1 ${runningBalance > 0 ? "text-red-600" : "text-green-600"}`}>
              {inr(Math.abs(runningBalance))}
            </div>
          </div>
        </div>
      </div>

      {/* Ledger + Payment form side by side */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-ink mb-4">Ledger</h2>
          <LedgerTable entries={entries} />
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink mb-4">Record Payment</h2>
          <div className="card p-5">
            <PaymentForm customerId={customerId} balanceDue={runningBalance} />
          </div>
        </div>
      </div>
    </main>
  );
}
