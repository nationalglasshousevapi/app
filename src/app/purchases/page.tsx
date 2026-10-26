import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { inr, formatDateReadable } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import PurchaseSearch from "@/components/PurchaseSearch";
import BackButton from "@/components/BackButton";
import { purchasePaymentSummary } from "@/lib/purchasePayments";

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

  let countQuery = sb
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("doc_type", "purchase");
  if (searchParams.q?.trim()) {
    const term = `%${searchParams.q.trim()}%`;
    countQuery = countQuery.or(
      `doc_number.ilike.${term},bill_to_name.ilike.${term}`
    );
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

  const purchaseIds = (purchases ?? []).map((purchase) => purchase.id);
  const { data: paymentRows } = purchaseIds.length
    ? await sb
        .from("purchase_payments")
        .select("document_id, amount")
        .in("document_id", purchaseIds)
    : { data: [] };
  const paidByDocument = new Map<string, number>();
  for (const payment of paymentRows ?? []) {
    paidByDocument.set(
      payment.document_id,
      (paidByDocument.get(payment.document_id) ?? 0) + Number(payment.amount)
    );
  }

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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link
            href="/purchases/scan"
            className="btn-secondary w-full sm:w-auto"
          >
            📷 Scan invoice
          </Link>
          <Link href="/purchases/new" className="btn-primary w-full sm:w-auto">
            + New purchase
          </Link>
        </div>
      </div>

      <PurchaseSearch initialQuery={searchParams.q ?? ""} />

      <div className="space-y-3 xl:hidden">
        {(purchases ?? []).map((p) => (
          <div key={p.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a
                  href={`/api/purchases/${p.id}/pdf`}
                  target="_blank"
                  className="font-semibold font-mono text-brand-700 hover:underline"
                >
                  {p.doc_number}
                </a>
                <p className="text-sm text-slate-500 mt-0.5">
                  {p.bill_to_name || "—"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDateReadable(p.doc_date)}
                </p>
              </div>
              <div className="text-right shrink-0 space-y-2">
                <p className="font-semibold">{inr(Number(p.total_amount))}</p>
                <p className="text-xs text-slate-500">
                  Paid {inr(paidByDocument.get(p.id) ?? 0)}
                </p>
                <p className="text-xs font-medium text-amber-700">
                  Balance{" "}
                  {inr(
                    purchasePaymentSummary(p.total_amount, [
                      { amount: paidByDocument.get(p.id) ?? 0 },
                    ]).balance
                  )}
                </p>
                <StatusBadge
                  documentId={p.id}
                  currentStatus={p.status}
                  docType="purchase"
                />
              </div>
            </div>
            <Link
              href={`/purchases/${p.id}`}
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 min-h-[44px] text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              Edit
            </Link>
          </div>
        ))}
        {!purchases?.length && (
          <div className="card p-6 text-center text-gray-400">
            No purchases found
          </div>
        )}
        {(purchases?.length ?? 0) > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/purchases?${new URLSearchParams({ ...(searchParams as Record<string, string>), page: String(currentPage - 1) }).toString()}`}
                  className="btn-secondary text-xs px-3 py-2 min-h-[44px]"
                >
                  ← Previous
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/purchases?${new URLSearchParams({ ...(searchParams as Record<string, string>), page: String(currentPage + 1) }).toString()}`}
                  className="btn-secondary text-xs px-3 py-2 min-h-[44px]"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card overflow-x-auto hidden xl:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-100">
              <th scope="col" className="p-4">
                Number
              </th>
              <th scope="col" className="p-4">
                Date
              </th>
              <th scope="col" className="p-4">
                Supplier
              </th>
              <th scope="col" className="p-4">
                Status
              </th>
              <th scope="col" className="p-4 text-right">
                Amount
              </th>
              <th scope="col" className="p-4 text-right">
                Paid
              </th>
              <th scope="col" className="p-4 text-right">
                Balance
              </th>
              <th scope="col" className="p-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(purchases ?? []).map((p) => (
              <tr key={p.id} className="table-row">
                <td className="p-4 font-semibold text-ink font-mono">
                  <a
                    href={`/api/purchases/${p.id}/pdf`}
                    target="_blank"
                    className="hover:underline"
                  >
                    {p.doc_number}
                  </a>
                </td>
                <td className="p-4 text-slate-500">
                  {formatDateReadable(p.doc_date)}
                </td>
                <td className="p-4 font-medium">{p.bill_to_name || "—"}</td>
                <td className="p-4">
                  <StatusBadge
                    documentId={p.id}
                    currentStatus={p.status}
                    docType="purchase"
                  />
                </td>
                <td className="p-4 text-right font-semibold">
                  {inr(Number(p.total_amount))}
                </td>
                <td className="p-4 text-right text-emerald-700">
                  {inr(paidByDocument.get(p.id) ?? 0)}
                </td>
                <td className="p-4 text-right font-semibold text-amber-700">
                  {inr(
                    purchasePaymentSummary(p.total_amount, [
                      { amount: paidByDocument.get(p.id) ?? 0 },
                    ]).balance
                  )}
                </td>
                <td className="p-4 text-right">
                  <Link
                    href={`/purchases/${p.id}`}
                    className="inline-flex items-center gap-1 rounded-lg px-3 min-h-[44px] text-xs font-medium text-brand-600 hover:bg-brand-50"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {!purchases?.length && (
              <tr>
                <td colSpan={8} className="p-8 text-center">
                  <p className="text-slate-500 font-medium">No purchases yet</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Record your first purchase entry to get started.
                  </p>
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
                  className="btn-secondary text-xs px-3 py-2 min-h-[44px]"
                >
                  ← Previous
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/purchases?${new URLSearchParams({ ...(searchParams as Record<string, string>), page: String(currentPage + 1) }).toString()}`}
                  className="btn-secondary text-xs px-3 py-2 min-h-[44px]"
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
