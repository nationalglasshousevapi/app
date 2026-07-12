import { supabaseServer } from "@/lib/supabaseServer";
import StatCard from "@/components/StatCard";
import RevenueChart from "@/components/RevenueChart";
import DocumentTypeChart from "@/components/DocumentTypeChart";
import TopCustomersChart from "@/components/TopCustomersChart";
import DocumentActions from "@/components/DocumentActions";
import { docTypeLabel } from "@/lib/docTypes";
import { inr, formatDateLong } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const sb = supabaseServer();

  const { data: invoices } = await sb
    .from("documents")
    .select("id, doc_date, doc_number, total_amount, customer_id, bill_to_name, bill_to_contact_number")
    .eq("doc_type", "invoice");

  const monthly = new Map<string, number>();
  const byCustomer = new Map<string, { id: string | null; name: string; total: number; count: number }>();
  let totalRevenue = 0;

  for (const inv of invoices ?? []) {
    const month = String(inv.doc_date).slice(0, 7);
    monthly.set(month, (monthly.get(month) ?? 0) + Number(inv.total_amount));
    totalRevenue += Number(inv.total_amount);

    const key = inv.customer_id ?? inv.bill_to_name ?? "unknown";
    const existing = byCustomer.get(key) ?? {
      id: inv.customer_id,
      name: inv.bill_to_name ?? "Unknown",
      total: 0,
      count: 0,
    };
    existing.total += Number(inv.total_amount);
    existing.count += 1;
    byCustomer.set(key, existing);
  }

  const monthlySeries = Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, total]) => ({ month, total }));

  const topCustomers = Array.from(byCustomer.entries())
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8)
    .map(([, value]) => value); // key no longer needed

  const { count: customerCount } = await sb
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { data: allDocs } = await sb.from("documents").select("doc_type, total_amount");

  const countsByType: Record<string, number> = {};
  const taxCollected = { cgst: 0, sgst: 0, igst: 0 };
  for (const d of allDocs ?? []) {
    countsByType[d.doc_type] = (countsByType[d.doc_type] ?? 0) + 1;
  }

  const documentTypeData = Object.entries(countsByType)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({ name: docTypeLabel(type), value: count, type }));

  const { data: recentInvoices } = await sb
    .from("documents")
    .select("id, doc_type, doc_number, doc_date, bill_to_name, total_amount, bill_to_contact_number")
    .eq("doc_type", "invoice")
    .order("doc_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  const thisMonth = new Date().toISOString().slice(0, 7);

  return {
    totalRevenue,
    thisMonthRevenue: monthly.get(thisMonth) ?? 0,
    invoiceCount: invoices?.length ?? 0,
    customerCount: customerCount ?? 0,
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
          <p className="text-xs font-semibold text-brand-600 tracking-wide uppercase">
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
        <StatCard label="This month" value={inr(d.thisMonthRevenue)} sub="Invoice total" accent="amber" href="/documents?type=invoice" />
        <StatCard label="Invoices" value={String(d.invoiceCount)} sub="Created" accent="blue" href="/documents?type=invoice" />
        <StatCard label="Customers" value={String(d.customerCount)} sub="Saved" accent="violet" href="/customers" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5 md:p-6">
          <div className="mb-4">
            <h2 className="font-bold text-slate-900">Monthly revenue</h2>
            <p className="text-sm text-slate-500">Last 12 months</p>
          </div>
          {d.monthlySeries.length ? (
            <RevenueChart data={d.monthlySeries} />
          ) : (
            <p className="text-sm text-slate-400 py-10 text-center">
              Create your first invoice to see sales here.
            </p>
          )}
        </div>

        {d.documentTypeData.length ? (
          <div className="card p-5 md:p-6">
            <div className="mb-4">
              <h2 className="font-bold text-slate-900">Documents by type</h2>
              <p className="text-sm text-slate-500">Distribution across all types</p>
            </div>
            <DocumentTypeChart data={d.documentTypeData} />
          </div>
        ) : null}
      </div>

      <div className="card p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">Recent invoices</h2>
            <p className="text-sm text-slate-500">Latest 5 invoices</p>
          </div>
          <Link href="/documents?type=invoice" className="text-sm font-semibold text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {d.recentInvoices.length ? (
          <div className="space-y-3 md:hidden">
            {d.recentInvoices.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{inv.doc_number}</p>
                    <p className="text-sm text-slate-500">{inv.bill_to_name || "—"}</p>
                  </div>
                  <p className="font-semibold text-slate-800">{inr(Number(inv.total_amount))}</p>
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
          <p className="text-sm text-gray-400 py-6 text-center">No invoices yet</p>
        )}
        {d.recentInvoices.length ? (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {d.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="table-row">
                    <td className="py-3 font-semibold">{inv.doc_number}</td>
                    <td className="py-3 text-slate-500">{inv.doc_date}</td>
                    <td className="py-3">{inv.bill_to_name || "—"}</td>
                    <td className="py-3 text-right font-semibold">{inr(Number(inv.total_amount))}</td>
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
            <h2 className="font-bold text-slate-900">Top customers</h2>
            <p className="text-sm text-slate-500">By revenue</p>
          </div>
          {d.topCustomers.length ? (
            <TopCustomersChart data={d.topCustomers} />
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
          )}
        </div>

        <div className="card p-5 md:p-6">
          <div className="mb-4">
            <h2 className="font-bold text-slate-900">Documents</h2>
            <p className="text-sm text-slate-500">Tap to view all</p>
          </div>
          {d.documentTypeData.length ? (
            <div className="space-y-2">
              {d.documentTypeData.map((item) => (
                <Link
                  key={item.type}
                  href={`/documents?type=${item.type}`}
                  className="flex items-center justify-between rounded-xl bg-slate-50/60 border border-slate-100 px-4 py-3 hover:border-brand-200 transition"
                >
                  <span className="font-medium text-sm text-slate-800">{item.name}</span>
                  <span className="font-bold text-sm text-slate-600">{item.value}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">No documents yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
