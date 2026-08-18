import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import PurchaseForm, { PurchaseFormValue } from "@/components/PurchaseForm";
import StatusBadge from "@/components/StatusBadge";
import { formatDateReadable } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PurchaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const sb = supabaseServer();
  const { data: doc } = await sb
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!doc || doc.doc_type !== "purchase") notFound();

  const { data: items } = await sb
    .from("document_items")
    .select("*")
    .eq("document_id", params.id)
    .order("position", { ascending: true });

  const initial: PurchaseFormValue = {
    id: doc.id,
    doc_number: doc.doc_number,
    doc_date: doc.doc_date,
    supplier_name: doc.bill_to_name ?? "",
    supplier_address: doc.bill_to_address ?? "",
    supplier_contact_person: doc.bill_to_contact_person ?? "",
    supplier_contact_number: doc.bill_to_contact_number ?? "",
    supplier_gst: doc.bill_to_gst ?? "",
    tax_type: doc.tax_type,
    tax_rate: Number(doc.tax_rate),
    remarks: doc.remarks ?? "",
    status: doc.status,
    items: (items ?? []).map((it) => ({
      description: it.description,
      size: it.size ?? "",
      hsn_code: it.hsn_code ?? "",
      qty: Number(it.qty),
      unit: it.unit ?? "sq.ft",
      rate: Number(it.rate),
    })),
  };

  return (
    <div className="space-y-7">
      <a href="/purchases" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
        <span>&larr;</span> Back to Purchases
      </a>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-600">Edit purchase</p>
          <h1 className="page-title">Purchase — {doc.doc_number}</h1>
          <p className="page-subtitle">Created {formatDateReadable(doc.created_at)}</p>
        </div>
        <div className="shrink-0 pt-1">
          <StatusBadge documentId={doc.id} currentStatus={doc.status} docType="purchase" />
        </div>
      </div>
      <div className="flex gap-2">
        <Link href={`/api/purchases/${doc.id}/pdf`} target="_blank" className="btn-secondary text-sm">
          View PDF
        </Link>
        <a href={`/api/purchases/${doc.id}/pdf`} download={`${doc.doc_number}.pdf`} className="btn-secondary text-sm">
          Download PDF
        </a>
      </div>
      <PurchaseForm initial={initial} />
    </div>
  );
}
