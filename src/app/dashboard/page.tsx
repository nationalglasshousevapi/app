import { supabaseServer } from "@/lib/supabaseServer";
import StatCard from "@/components/StatCard";
import RevenueChart from "@/components/RevenueChart";
import DocumentTypeChart from "@/components/DocumentTypeChart";
import TopCustomersChart from "@/components/TopCustomersChart";
import DocumentActions from "@/components/DocumentActions";
import { docTypeLabel } from "@/lib/docTypes";
import { inr, formatDateLong, formatMonthKey } from "@/lib/format";
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

  const { data: recentInvoices } = await sb
    .from("documents")
    .select("id, doc_type, doc_number, doc_date, bill_to_name, total_amount, bill_to_contact_number")
    .eq("doc_type", "invoice")
    .order("doc_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    totalRevenue: s?.totalRevenue ?? 0,
    thisMonthRevenue: s?.thisMonthRevenue ?? 0,
    invoiceCount: s?.invoiceCount ?? 0,
    customerCount: s?.customerCount ?? 0,
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
        <Link href="/documents/new" className="btn-primary w-full sm:w-auto">
          + Create document
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={inr(d.totalRevenue)} sub="All time" accent="teal" href="/documents?type=invoice" />
        <StatCard label="This month" value={inr(d.thisMonthRevenue)} sub="Invoice total" accent="brass" href="/documents?type=invoice" />
        <StatCard label="Invoices" value={String(d.invoiceCount)} sub="Created" accent="pane" href="/documents?type=invoice" />
        <StatCard label="Customers" value={String(d.customerCount)} sub="Saved" accent="blue" href="/customers" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5 md:p-6">
          <div className="mb-4">
            <h2 className="font-display font-bold text-ink">Monthly revenue</h2>
            <p className="text-sm text-slate-500 font-body">Last 12 months</p>
          </div>
          {d.monthlySeries.length ? (
            <RevenueChart data={d.monthlySeries} />
          ) : (
            <p className="text-sm text-slate-400 py-10 text-center font-body">
              No invoices yet &mdash; create your first one to see sales here.
            </p>
          )}
        </div>

        {d.documentTypeData.length ? (
          <div className="card p-5 md:p-6">
            <div className="mb-4">
              <h2 className="font-display font-bold text-ink">Documents by type</h2>
              <p className="text-sm text-slate-500 font-body">Distribution across all types</p>
            </div>
            <DocumentTypeChart data={d.documentTypeData} />
          </div>
        ) : null}
      </div>

      <div className="card p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-ink">Recent invoices</h2>
            <p className="text-sm text-slate-500 font-body">Latest 5 invoices</p>
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
          <p className="text-sm text-slate-400 py-6 text-center font-body">No invoices yet.</p>
        )}
        {d.recentInvoices.length ? (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm font-body">
              <tbody>
                {d.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="table-row">
                    <td className="py-3 font-semibold font-mono text-ink">{inv.doc_number}</td>
                    <td className="py-3 text-slate-500">{inv.doc_date}</td>
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
            <TopCustomersChart data={d.topCustomers} />
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
    </div>
  );
}
