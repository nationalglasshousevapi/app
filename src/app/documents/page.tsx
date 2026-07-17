import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { docTypeLabel } from "@/lib/docTypes";
import { inr, formatDateReadable, formatDateShort } from "@/lib/format";
import DocumentSearch from "@/components/DocumentSearch";
import DocumentActions from "@/components/DocumentActions";
import BatchDownloadPanel from "@/components/BatchDownloadPanel";
import StatusBadge from "@/components/StatusBadge";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 50;

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-brass-50 text-brass-700",
  paid: "bg-emerald-50 text-signal-green",
  cancelled: "bg-red-50 text-signal-rust",
};

function getDateRange(year: string, months?: string): { from?: string; to?: string } {
  const y = parseInt(year, 10);
  if (!months) return { from: `${y}-01-01`, to: `${y}-12-31` };
  const list = months.split(",").map(Number).filter((m) => m >= 1 && m <= 12);
  if (list.length === 0) return { from: `${y}-01-01`, to: `${y}-12-31` };
  const minMonth = Math.min(...list);
  const maxMonth = Math.max(...list);
  const from = `${y}-${String(minMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(y, maxMonth, 0).getDate();
  const to = `${y}-${String(maxMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { type?: string; customer_id?: string; q?: string; year?: string; months?: string; page?: string };
}) {
  const sb = supabaseServer();

  const currentPage = Math.max(1, Number(searchParams.page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Count first so we know total pages
  let countQuery = sb
    .from("documents")
    .select("*", { count: "exact", head: true });

  if (searchParams.type) countQuery = countQuery.eq("doc_type", searchParams.type);
  if (searchParams.customer_id) countQuery = countQuery.eq("customer_id", searchParams.customer_id);
  if (searchParams.q?.trim()) {
    const term = `%${searchParams.q.trim()}%`;
    countQuery = countQuery.or(`doc_number.ilike.${term},bill_to_name.ilike.${term}`);
  }
  if (searchParams.year) {
    const { from: fromDate, to: toDate } = getDateRange(searchParams.year, searchParams.months);
    if (fromDate && toDate) {
      countQuery = countQuery.gte("doc_date", fromDate).lte("doc_date", toDate);
    }
  }

  const { count: totalCount } = await countQuery;
  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  // Fetch current page
  let query = sb
    .from("documents")
    .select("id, doc_type, doc_number, doc_date, bill_to_name, bill_to_contact_number, total_amount, status, customer_id")
    .order("doc_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchParams.type) query = query.eq("doc_type", searchParams.type);
  if (searchParams.customer_id) query = query.eq("customer_id", searchParams.customer_id);
  if (searchParams.q?.trim()) {
    const term = `%${searchParams.q.trim()}%`;
    query = query.or(`doc_number.ilike.${term},bill_to_name.ilike.${term}`);
  }
  if (searchParams.year) {
    const { from: fromDate, to: toDate } = getDateRange(searchParams.year, searchParams.months);
    if (fromDate && toDate) {
      query = query.gte("doc_date", fromDate).lte("doc_date", toDate);
    }
  }

  const { data: documents } = await query;

  let filterLabel = "";
  if (searchParams.customer_id) {
    const { data: customer } = await sb
      .from("customers")
      .select("name")
      .eq("id", searchParams.customer_id)
      .single();
    filterLabel = customer?.name ? `Invoices for ${customer.name}` : "Filtered documents";
  } else if (searchParams.q) {
    filterLabel = `Search: "${searchParams.q}"`;
  } else if (searchParams.type) {
    filterLabel = docTypeLabel(searchParams.type);
  }

  const types = [
    "invoice",
    "quotation",
    "performa_invoice",
    "estimate",
  ];

  return (
    <div className="space-y-7">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">
            {filterLabel || `${(documents ?? []).length} of ${totalCount ?? 0} documents`}
          </p>
        </div>
        <Link href="/documents/new" className="btn-primary w-full sm:w-auto">
          + New document
        </Link>
      </div>

      <BatchDownloadPanel />
      <DocumentSearch initialQuery={searchParams.q ?? ""} />

      <div className="card p-3 flex flex-wrap gap-2">
        <Link
          href="/documents"
          className={`text-sm px-3 py-2 rounded-full border min-h-[40px] inline-flex items-center ${
            !searchParams.type && !searchParams.customer_id && !searchParams.q
              ? "bg-brass-500 text-white border-brass-500 shadow-sm"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All
        </Link>
        {types.map((t) => (
          <Link
            key={t}
            href={`/documents?type=${t}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ""}${searchParams.customer_id ? `&customer_id=${searchParams.customer_id}` : ""}`}
            className={`text-sm px-3 py-2 rounded-full border min-h-[40px] inline-flex items-center ${
              searchParams.type === t
                ? "bg-brass-500 text-white border-brass-500 shadow-sm"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {docTypeLabel(t)}
          </Link>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {(documents ?? []).map((doc) => (
          <div key={doc.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">{doc.doc_number}</p>
                <p className="text-sm text-slate-500">{doc.bill_to_name || "—"}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDateShort(doc.doc_date)}</p>
              </div>
              <div className="text-right space-y-2">
                <p className="font-semibold">{inr(Number(doc.total_amount))}</p>
                <StatusBadge documentId={doc.id} currentStatus={doc.status} />
              </div>
            </div>
            <p className="text-xs text-slate-500">{docTypeLabel(doc.doc_type)}</p>
            <DocumentActions
              id={doc.id}
              docNumber={doc.doc_number}
              docType={doc.doc_type}
              customerName={doc.bill_to_name ?? ""}
              contactNumber={doc.bill_to_contact_number}
              totalAmount={Number(doc.total_amount)}
            />
          </div>
        ))}
        {!documents?.length && (
          <div className="card p-6 text-center text-gray-400">No documents found</div>
        )}
        {(documents?.length ?? 0) > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/documents?${new URLSearchParams({ ...searchParams as Record<string, string>, page: String(currentPage - 1) }).toString()}`}
                  className="btn-secondary text-xs px-3 py-2 min-h-[40px]"
                >
                  ← Previous
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/documents?${new URLSearchParams({ ...searchParams as Record<string, string>, page: String(currentPage + 1) }).toString()}`}
                  className="btn-secondary text-xs px-3 py-2 min-h-[40px]"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-100">
              <th scope="col" className="p-4">Number</th>
              <th scope="col" className="p-4">Type</th>
              <th scope="col" className="p-4">Date</th>
              <th scope="col" className="p-4">Customer</th>
              <th scope="col" className="p-4">Status</th>
              <th scope="col" className="p-4 text-right">Amount</th>
              <th scope="col" className="p-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {(documents ?? []).map((doc) => (
              <tr key={doc.id} className="table-row">
                <td className="p-4 font-semibold text-ink font-mono">
                  <a href={`/api/documents/${doc.id}/pdf`} target="_blank" className="hover:underline">
                    {doc.doc_number}
                  </a>
                </td>
                <td className="p-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{docTypeLabel(doc.doc_type)}</span></td>
                <td className="p-4 text-slate-500">{formatDateReadable(doc.doc_date)}</td>
                <td className="p-4 font-medium">
                  {doc.customer_id ? (
                    <Link href={`/documents?customer_id=${doc.customer_id}`} className="text-brand-700 hover:underline">
                      {doc.bill_to_name || "—"}
                    </Link>
                  ) : (
                    doc.bill_to_name || "—"
                  )}
                </td>
                <td className="p-4">
                  <StatusBadge documentId={doc.id} currentStatus={doc.status} />
                </td>
                <td className="p-4 text-right font-semibold">
                  {inr(Number(doc.total_amount))}
                </td>
                <td className="p-4 text-right">
                  <DocumentActions
                    id={doc.id}
                    docNumber={doc.doc_number}
                    docType={doc.doc_type}
                    customerName={doc.bill_to_name ?? ""}
                    contactNumber={doc.bill_to_contact_number}
                    totalAmount={Number(doc.total_amount)}
                    compact
                  />
                </td>
              </tr>
            ))}
            {!documents?.length && (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <p className="text-slate-500 font-medium">No documents yet</p>
                  <p className="text-slate-400 text-sm mt-1">Create your first invoice, quotation, or estimate to get started.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {(documents?.length ?? 0) > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/documents?${new URLSearchParams({ ...searchParams as Record<string, string>, page: String(currentPage - 1) }).toString()}`}
                  className="btn-secondary text-xs px-3 py-2 min-h-[40px]"
                >
                  ← Previous
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/documents?${new URLSearchParams({ ...searchParams as Record<string, string>, page: String(currentPage + 1) }).toString()}`}
                  className="btn-secondary text-xs px-3 py-2 min-h-[40px]"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
