import { supabaseServer } from "@/lib/supabaseServer";
import StatCard from "@/components/StatCard";
import LazyMount from "@/components/LazyMount";
import RevenueChart from "@/components/RevenueChart";
import DocumentTypeChart from "@/components/DocumentTypeChart";
import TopCustomersChart from "@/components/TopCustomersChart";
import DocumentActions from "@/components/DocumentActions";
import GstExport from "@/components/GstExport";
import { docTypeLabel } from "@/lib/docTypes";
import { inr, formatDateLong, formatDateShort, formatMonthKey } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface DashboardStats {
  totalRevenue: number;
  thisMonthRevenue: number;
  invoiceCount: number;
  customerCount: number;
  monthlySeries: { month: string; total: number }[] | null;
  topCustomers: { id: string | null; name: string; total: number; count: number }[] | null;
  documentTypeData: { type: string; count: number }[] | null;
}

async function getDashboardData() {
  const sb = supabaseServer();

  const { data: stats } = await sb.rpc("get_dashboard_stats");
  const s = stats as unknown as DashboardStats | null;

  const monthlySeries = (s?.monthlySeries ?? [])
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(({ month, total }) => ({ month: formatMonthKey(month), total }));

  const topCustomers = s?.topCustomers ?? [];
  const docTypeCounts = s?.documentTypeData ?? [];

  const documentTypeData = docTypeCounts
    .sort((a, b) => b.count - a.count)
    .map(({ type, count }) => ({ name: docTypeLabel(type), value: count, type }));

  const dateStr = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  const [
    recentInvoicesResult,
    receivableResult,
    debtorsResult,
    todayPaymentsResult,
    purchaseResult,
    expenseResult,
  ] = await Promise.all([
    sb
      .from("documents")
      .select("id, doc_type, doc_number, doc_date, bill_to_name, total_amount, bill_to_contact_number")
      .in("doc_type", ["invoice", "order"])
      .order("doc_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    sb.from("customer_ledger_view").select("balance_due"),
    sb
      .from("customer_ledger_view")
      .select("*")
      .gt("balance_due", 0)
      .order("balance_due", { ascending: false })
      .limit(6),
    sb.from("payments").select("amount").eq("payment_date", dateStr),
    sb
      .from("documents")
      .select("total_amount")
      .eq("doc_type", "purchase")
      .gte("doc_date", `${thisMonth}-01`)
      .lte("doc_date", `${thisMonth}-31`),
    sb
      .from("expenses")
      .select("amount")
      .gte("expense_date", `${thisMonth}-01`)
      .lte("expense_date", `${thisMonth}-31`),
  ]);

  const { data: recentInvoices } = recentInvoicesResult;
  const { data: receivableData } = receivableResult;
  const { data: debtors } = debtorsResult;
  const { data: todayPayments } = todayPaymentsResult;
  const { data: purchaseData } = purchaseResult;
  const { data: expenseData } = expenseResult;

  const totalReceivable = (receivableData ?? []).reduce((s, r) => s + Number(r.balance_due), 0);
  const todayCollections = (todayPayments ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const thisMonthPurchases = (purchaseData ?? []).reduce((s, r) => s + Number(r.total_amount), 0);
  const thisMonthExpenses = (expenseData ?? []).reduce((s, r) => s + Number(r.amount), 0);

  // Top debtors + how old their oldest unpaid invoice/order is (depends on debtor ids)
  const debtorIds = (debtors ?? []).map((d) => d.customer_id);
  const oldestOpen: Record<string, string> = {};
  if (debtorIds.length) {
    const { data: openInvoices } = await sb
      .from("documents")
      .select("customer_id, doc_date")
      .in("doc_type", ["invoice", "order"])
      .in("status", ["draft", "sent"])
      .in("customer_id", debtorIds)
      .order("doc_date");
    for (const inv of openInvoices ?? []) {
      if (!inv.customer_id) continue;
      if (!oldestOpen[inv.customer_id] || inv.doc_date < oldestOpen[inv.customer_id]) {
        oldestOpen[inv.customer_id] = inv.doc_date;
      }
    }
  }

  return {
    totalRevenue: s?.totalRevenue ?? 0,
    thisMonthRevenue: s?.thisMonthRevenue ?? 0,
    invoiceCount: s?.invoiceCount ?? 0,
    customerCount: s?.customerCount ?? 0,
    totalReceivable,
    todayCollections,
    thisMonthPurchases,
    thisMonthExpenses,
    debtors: (debtors ?? []).map((d) => ({
      customerId: d.customer_id as string,
      name: d.customer_name as string,
      balanceDue: Number(d.balance_due),
      oldestInvoiceDate: oldestOpen[d.customer_id] ?? null,
    })),
    monthlySeries,
    topCustomers,
    documentTypeData,
    recentInvoices: recentInvoices ?? [],
  };
}

export default async function DashboardPage() {
  const d = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-brand-500 tracking-wide uppercase font-body">
            {formatDateLong()}
          </p>
          <h1 className="page-title mb-0">Dashboard</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/cash-sale" className="btn-primary w-full sm:w-auto">
            <span className="text-lg leading-none">+</span>
            Quick cash sale
          </Link>
          <Link href="/documents/new" className="btn-secondary w-full sm:w-auto text-center">
            Create document
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Collected today" value={inr(d.todayCollections)} sub="Payments received" accent="teal" href="/daybook" />
        <StatCard label="Expenses (month)" value={inr(d.thisMonthExpenses)} sub="This month" accent="blue" href="/expenses" />
        <StatCard label="Purchases (month)" value={inr(d.thisMonthPurchases)} sub="This month" accent="brass" href="/purchases" />
        <StatCard label="Day book" value={formatDateShort(new Date())} sub="Everything today" accent="pane" href="/daybook" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Revenue" value={inr(d.totalRevenue)} sub="All time" accent="teal" href="/documents?type=invoice" />
        <StatCard label="This month" value={inr(d.thisMonthRevenue)} sub="Invoice total" accent="brass" href="/documents?type=invoice" />
        <StatCard label="Invoices" value={String(d.invoiceCount)} sub="Created" accent="pane" href="/documents?type=invoice" />
        <StatCard label="Customers" value={String(d.customerCount)} sub="Saved" accent="blue" href="/customers" />
        <StatCard label="Receivable" value={inr(d.totalReceivable)} sub="Outstanding" accent="brass" href="/accounts" />
      </div>

      {d.debtors.length > 0 && (
        <div className="card p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-ink">Who owes money</h2>
              <p className="text-sm text-slate-500 font-body">Top outstanding balances &amp; how long they&apos;ve been open</p>
            </div>
            <Link href="/accounts" className="text-sm font-semibold text-brand-500 hover:underline font-body whitespace-nowrap">
              All accounts
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {d.debtors.map((debtor) => {
              const days = debtor.oldestInvoiceDate
                ? Math.max(0, Math.floor((Date.now() - new Date(debtor.oldestInvoiceDate).getTime()) / 86400000))
                : null;
              const aging = days === null ? null : days > 90 ? "text-red-600 bg-red-50" : days > 30 ? "text-amber-700 bg-amber-50" : "text-slate-500 bg-slate-100";
              return (
                <li key={debtor.customerId}>
                  <Link
                    href={`/accounts/${debtor.customerId}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50/60 rounded-lg px-2 -mx-2 transition"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-ink truncate">{debtor.name}</p>
                      <p className="text-xs text-slate-400">Oldest unpaid invoice: {debtor.oldestInvoiceDate ? formatDateShort(debtor.oldestInvoiceDate) : "—"}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {aging && (
                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${aging}`}>
                          {days} day{days === 1 ? "" : "s"}
                        </span>
                      )}
                      <span className="font-mono font-bold text-ink">{inr(debtor.balanceDue)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5 md:p-6">
          <div className="mb-4">
            <h2 className="font-display font-bold text-ink">Monthly revenue</h2>
            <p className="text-sm text-slate-500 font-body">Last 12 months</p>
          </div>
          {d.monthlySeries.length ? (
            <LazyMount minHeight={280}>
              <RevenueChart data={d.monthlySeries} />
            </LazyMount>
          ) : (
            <p className="text-sm text-slate-400 py-10 text-center font-body">
              No invoices or orders yet &mdash; create your first one to see sales here.
            </p>
          )}
        </div>

        {d.documentTypeData.length ? (
          <div className="card p-5 md:p-6">
            <div className="mb-4">
              <h2 className="font-display font-bold text-ink">Documents by type</h2>
              <p className="text-sm text-slate-500 font-body">Distribution across all types</p>
            </div>
            <LazyMount minHeight={280}>
              <DocumentTypeChart data={d.documentTypeData} />
            </LazyMount>
          </div>
        ) : null}
      </div>

      <div className="card p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-ink">Recent invoices &amp; orders</h2>
            <p className="text-sm text-slate-500 font-body">Latest 5 sales documents</p>
          </div>
          <Link href="/documents?type=invoice" className="text-sm font-semibold text-brand-500 hover:underline font-body">
            View all
          </Link>
        </div>
        {d.recentInvoices.length ? (
          <div className="space-y-3 md:hidden">
            {d.recentInvoices.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{inv.doc_number}</p>
                    <p className="text-xs text-slate-400">{formatDateShort(inv.doc_date)}</p>
                    <p className="text-sm text-slate-500 font-body">{inv.bill_to_name || "\u2014"}</p>
                  </div>
                  <p className="font-semibold text-ink">{inr(Number(inv.total_amount))}</p>
                </div>
                <DocumentActions
                  id={inv.id}
                  docNumber={inv.doc_number}
                  docType={inv.doc_type}
                  customerName={inv.bill_to_name ?? ""}
                  contactNumber={inv.bill_to_contact_number}
                  totalAmount={Number(inv.total_amount)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-6 text-center font-body">No invoices or orders yet.</p>
        )}
        {d.recentInvoices.length ? (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm font-body">
              <tbody>
                {d.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="table-row">
                    <td className="py-3 font-semibold font-mono text-ink">{inv.doc_number}</td>
                    <td className="py-3 text-slate-500">{formatDateShort(inv.doc_date)}</td>
                    <td className="py-3 text-ink">{inv.bill_to_name || "\u2014"}</td>
                    <td className="py-3 text-right font-semibold font-mono text-ink">{inr(Number(inv.total_amount))}</td>
                    <td className="py-3 text-right">
                      <DocumentActions
                        id={inv.id}
                        docNumber={inv.doc_number}
                        docType={inv.doc_type}
                        customerName={inv.bill_to_name ?? ""}
                        contactNumber={inv.bill_to_contact_number}
                        totalAmount={Number(inv.total_amount)}
                        compact
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5 md:p-6">
          <div className="mb-4">
            <h2 className="font-display font-bold text-ink">Top customers</h2>
            <p className="text-sm text-slate-500 font-body">By revenue</p>
          </div>
          {d.topCustomers.length ? (
            <LazyMount minHeight={280}>
              <TopCustomersChart data={d.topCustomers} />
            </LazyMount>
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center font-body">No data yet.</p>
          )}
        </div>

        <div className="card p-5 md:p-6">
          <div className="mb-4">
            <h2 className="font-display font-bold text-ink">Documents</h2>
            <p className="text-sm text-slate-500 font-body">Tap to view all</p>
          </div>
          {d.documentTypeData.length ? (
            <div className="space-y-2">
              {d.documentTypeData.map((item) => (
                <Link
                  key={item.type}
                  href={`/documents?type=${item.type}`}
                  className="flex items-center justify-between rounded-xl bg-slate-50/60 border border-slate-100 px-4 py-3 hover:border-brand-200 transition"
                >
                  <span className="font-medium text-sm text-ink">{item.name}</span>
                  <span className="font-bold text-sm text-slate-600">{item.value}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center font-body">No documents yet.</p>
          )}
        </div>
      </div>

      <GstExport />
    </div>
  );
}
