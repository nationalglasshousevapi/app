import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { inr, formatDateReadable } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import PurchaseSearch from "@/components/PurchaseSearch";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 50;

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const sb = supabaseServer();
  const currentPage = Math.max(1, Number(searchParams.page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let countQuery = sb.from("documents").select("*", { count: "exact", head: true }).eq("doc_type", "purchase");
  if (searchParams.q?.trim()) {
    const term = `%${searchParams.q.trim()}%`;
    countQuery = countQuery.or(`doc_number.ilike.${term},bill_to_name.ilike.${term}`);
  }
  const { count: totalCount } = await countQuery;
  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  let query = sb
    .from("documents")
    .select("id, doc_number, doc_date, bill_to_name, total_amount, status")
    .eq("doc_type", "purchase")
    .order("doc_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (searchParams.q?.trim()) {
    const term = `%${searchParams.q.trim()}%`;
    query = query.or(`doc_number.ilike.${term},bill_to_name.ilike.${term}`);
  }
  const { data: purchases } = await query;

  return (
    <div className="space-y-7">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">
            {searchParams.q
              ? `Search: "${searchParams.q}"`
              : `${(purchases ?? []).length} of ${totalCount ?? 0} purchases`}
          </p>
        </div>
        <Link href="/purchases/new" className="btn-primary w-full sm:w-auto">
          + New purchase
        </Link>
      </div>

      <PurchaseSearch initialQuery={searchParams.q ?? ""} />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-100">
              <th scope="col" className="p-4">Number</th>
              <th scope="col" className="p-4">Date</th>
              <th scope="col" className="p-4">Supplier</th>
              <th scope="col" className="p-4">Status</th>
              <th scope="col" className="p-4 text-right">Amount</th>
              <th scope="col" className="p-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {(purchases ?? []).map((p) => (
              <tr key={p.id} className="table-row">
                <td className="p-4 font-semibold text-ink font-mono">
                  <a href={`/api/purchases/${p.id}/pdf`} target="_blank" className="hover:underline">
                    {p.doc_number}
                  </a>
                </td>
                <td className="p-4 text-slate-500">{formatDateReadable(p.doc_date)}</td>
                <td className="p-4 font-medium">{p.bill_to_name || "—"}</td>
                <td className="p-4">
                  <StatusBadge documentId={p.id} currentStatus={p.status} docType="purchase" />
                </td>
                <td className="p-4 text-right font-semibold">{inr(Number(p.total_amount))}</td>
                <td className="p-4 text-right">
                  <Link href={`/purchases/${p.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {!purchases?.length && (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <p className="text-slate-500 font-medium">No purchases yet</p>
                  <p className="text-slate-400 text-sm mt-1">Record your first purchase entry to get started.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {(purchases?.length ?? 0) > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/purchases?${new URLSearchParams({ ...(searchParams as Record<string, string>), page: String(currentPage - 1) }).toString()}`}
                  className="btn-secondary text-xs px-3 py-2 min-h-[40px]"
                >
                  ← Previous
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/purchases?${new URLSearchParams({ ...(searchParams as Record<string, string>), page: String(currentPage + 1) }).toString()}`}
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
