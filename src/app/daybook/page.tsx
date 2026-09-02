import { supabaseServer } from "@/lib/supabaseServer";
import BackButton from "@/components/BackButton";
import { inr, formatDateLong, formatDateShort } from "@/lib/format";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import Link from "next/link";

export const dynamic = "force-dynamic";

function modeLabel(v: string) {
  return PAYMENT_MODES.find((m) => m.value === v)?.label ?? v;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function DayBookPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;
  const sb = supabaseServer();

  const [invoicesRes, paymentsRes, purchasesRes, expensesRes] = await Promise.all([
    sb
      .from("documents")
      .select("id, doc_number, doc_date, bill_to_name, total_amount, status, doc_type")
      .in("doc_type", ["invoice", "order", "receipt"])
      .neq("status", "cancelled")
      .eq("doc_date", date)
      .order("created_at"),
    sb
      .from("payments")
      .select("id, amount, payment_mode, reference_number, customers(name), document_id")
      .eq("payment_date", date)
      .order("created_at"),
    sb
      .from("documents")
      .select("id, doc_number, bill_to_name, total_amount")
      .eq("doc_type", "purchase")
      .neq("status", "cancelled")
      .eq("doc_date", date),
    sb.from("expenses").select("*").eq("expense_date", date).order("created_at"),
  ]);

  const sales = invoicesRes.data?.filter((d) => d.doc_type === "invoice" || d.doc_type === "order") ?? [];
  const receipts = invoicesRes.data?.filter((d) => d.doc_type === "receipt") ?? [];
  const payments = paymentsRes.data ?? [];
  const purchases = purchasesRes.data ?? [];
  const expenses = expensesRes.data ?? [];

  const collectedTotal = payments.reduce((s, p) => s + Number(p.amount), 0);
  const spentTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const cashIn = payments.filter((p) => p.payment_mode === "cash").reduce((s, p) => s + Number(p.amount), 0);
  const cashOut = expenses.filter((e) => e.payment_mode === "cash").reduce((s, e) => s + Number(e.amount), 0);
  const salesTotal = sales.reduce((s, d) => s + Number(d.total_amount), 0);

  const collectionModes = PAYMENT_MODES.map((m) => ({
    mode: m,
    total: payments.filter((p) => p.payment_mode === m.value).reduce((s, p) => s + Number(p.amount), 0),
    count: payments.filter((p) => p.payment_mode === m.value).length,
  })).filter((x) => x.count > 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      <h1 className="page-title">Day Book</h1>

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-6 -mt-2">
        <Link href={`/daybook?date=${shiftDate(date, -1)}`} className="btn-secondary !py-1.5 text-sm">
          ← Prev
        </Link>
        <span className="text-sm font-semibold text-slate-600">{formatDateLong(new Date(`${date}T00:00:00`))}</span>
        <Link
          href={`/daybook?date=${shiftDate(date, 1)}`}
          className={`btn-secondary !py-1.5 text-sm ${date >= today ? "opacity-40 pointer-events-none" : ""}`}
        >
          Next →
        </Link>
        {date !== today && (
          <Link href="/daybook" className="text-sm font-semibold text-brand-500 hover:underline">
            Today
          </Link>
        )}
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Collected</p>
          <p className="text-xl font-bold font-mono mt-1 text-brand-600">{inr(collectedTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Spent</p>
          <p className="text-xl font-bold font-mono mt-1 text-red-500">{inr(spentTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cash on hand change</p>
          <p className={`text-xl font-bold font-mono mt-1 ${cashIn - cashOut >= 0 ? "text-brand-600" : "text-red-500"}`}>
            {cashIn - cashOut >= 0 ? "+" : ""}
            {inr(cashIn - cashOut)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Cash in {inr(cashIn)} · out {inr(cashOut)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sales booked</p>
          <p className="text-xl font-bold font-mono mt-1">{inr(salesTotal)}</p>
        </div>
      </div>

      {/* Collections by mode */}
      {collectionModes.length > 0 && (
        <section className="card p-5 mb-6">
          <h2 className="font-display font-bold text-ink mb-3">Collections</h2>
          <div className="flex flex-wrap gap-3">
            {collectionModes.map(({ mode, total, count }) => (
              <div key={mode.value} className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-500">{mode.label}</p>
                <p className="font-mono font-bold">{inr(total)}</p>
                <p className="text-[11px] text-slate-400">{count} payment{count > 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Payments detail */}
        <section className="card p-5">
          <h2 className="font-display font-bold text-ink mb-3">Payments received</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center font-body">No payments this day.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {(Array.isArray(p.customers) ? p.customers[0]?.name : null) ?? "Walk-in customer"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {modeLabel(p.payment_mode)}
                      {p.reference_number ? ` · ${p.reference_number}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-semibold text-sm">{inr(Number(p.amount))}</p>
                    {p.document_id && (
                      <Link href={`/documents/${p.document_id}`} className="text-xs text-brand-500 hover:underline">
                        View doc
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Expenses detail */}
        <section className="card p-5">
          <h2 className="font-display font-bold text-ink mb-3">Expenses</h2>
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center font-body">No expenses this day.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {e.description || modeLabel(e.payment_mode) + " expense"}
                    </p>
                    <p className="text-xs text-slate-400">{modeLabel(e.payment_mode)}</p>
                  </div>
                  <p className="font-mono font-semibold text-sm text-red-500 shrink-0">-{inr(Number(e.amount))}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Invoices + orders */}
        <section className="card p-5">
          <h2 className="font-display font-bold text-ink mb-3">Invoices &amp; orders created</h2>
          {sales.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center font-body">No invoices or orders this day.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sales.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <Link href={`/documents/${d.id}`} className="text-sm font-semibold font-mono text-brand-600 hover:underline">
                      {d.doc_number}
                    </Link>
                    <p className="text-xs text-slate-400 truncate">{d.bill_to_name || "—"}</p>
                  </div>
                  <p className="font-mono font-semibold text-sm shrink-0">{inr(Number(d.total_amount))}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Receipts + purchases */}
        <section className="card p-5">
          <h2 className="font-display font-bold text-ink mb-3">Receipts & purchases</h2>
          {receipts.length === 0 && purchases.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center font-body">Nothing else this day.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {receipts.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <Link href={`/documents/${d.id}`} className="text-sm font-semibold font-mono text-brand-600 hover:underline">
                      {d.doc_number}
                    </Link>
                    <p className="text-xs text-slate-400">Receipt · {d.bill_to_name || "—"}</p>
                  </div>
                  <p className="font-mono font-semibold text-sm shrink-0">{inr(Number(d.total_amount))}</p>
                </li>
              ))}
              {purchases.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <Link href={`/purchases/${d.id}`} className="text-sm font-semibold font-mono text-brand-600 hover:underline">
                      {d.doc_number}
                    </Link>
                    <p className="text-xs text-slate-400">Purchase · {d.bill_to_name || "—"}</p>
                  </div>
                  <p className="font-mono font-semibold text-sm text-red-500 shrink-0">-{inr(Number(d.total_amount))}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
