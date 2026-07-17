import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import DocumentForm, { DocumentFormValue } from "@/components/DocumentForm";
import StatusBadge from "@/components/StatusBadge";
import { docTypeLabel } from "@/lib/docTypes";
import { formatDateReadable } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const sb = supabaseServer();

  const { data: doc } = await sb.from("documents").select("*").eq("id", params.id).single();
  if (!doc) notFound();

  const { data: items } = await sb
    .from("document_items")
    .select("*")
    .eq("document_id", params.id)
    .order("position", { ascending: true });

  const initial: DocumentFormValue = {
    id: doc.id,
    doc_type: doc.doc_type,
    doc_number: doc.doc_number,
    doc_date: doc.doc_date,
    order_number: doc.order_number ?? "",
    order_date: doc.order_date ?? "",
    customer_id: doc.customer_id,
    bill_to_name: doc.bill_to_name ?? "",
    bill_to_address: doc.bill_to_address ?? "",
    bill_to_contact_person: doc.bill_to_contact_person ?? "",
    bill_to_contact_number: doc.bill_to_contact_number ?? "",
    bill_to_email: doc.bill_to_email ?? "",
    bill_to_gst: doc.bill_to_gst ?? "",
    ship_to_name: doc.ship_to_name ?? "",
    ship_to_address: doc.ship_to_address ?? "",
    ship_to_contact_person: doc.ship_to_contact_person ?? "",
    ship_to_contact_number: doc.ship_to_contact_number ?? "",
    tax_type: doc.tax_type,
    tax_rate: Number(doc.tax_rate),
    round_off: Number(doc.round_off),
    discount_amount: Number(doc.discount_amount ?? 0),
    additional_charges: doc.additional_charges ?? [],
    remarks: doc.remarks ?? "",
    status: doc.status,
    items: (items ?? []).map((it) => ({
      description: it.description,
      size: it.size ?? "",
      hsn_code: it.hsn_code ?? "",
      qty: Number(it.qty),
      unit: it.unit ?? "sq.ft",
      rate: Number(it.rate),
      actual_length: Number(it.actual_length ?? 0),
      actual_width: Number(it.actual_width ?? 0),
      nos: Number(it.nos ?? 1),
      calculated_length: Number(it.calculated_length ?? 0),
      calculated_width: Number(it.calculated_width ?? 0),
      item_type: it.item_type || "glass",
    })),
  };

  return (
    <div className="space-y-7">
      <a href="/documents" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
        <span>&larr;</span> Back to Documents
      </a>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-600">Edit document</p>
          <h1 className="page-title">
            {docTypeLabel(doc.doc_type)} — {doc.doc_number}
          </h1>
          <p className="page-subtitle">Created {formatDateReadable(doc.created_at)}</p>
        </div>
        <div className="shrink-0 pt-1">
          <StatusBadge documentId={doc.id} currentStatus={doc.status} />
        </div>
      </div>
      <DocumentForm initial={initial} />
    </div>
  );
}
