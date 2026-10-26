import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import PurchaseForm, { PurchaseFormValue } from "@/components/PurchaseForm";
import PurchaseScanManager from "@/components/PurchaseScanManager";
import PurchasePayments from "@/components/PurchasePayments";
import LedgerShareActions from "@/components/LedgerShareActions";
import type { PurchasePayment } from "@/lib/purchasePayments";
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

  const { data: payments } = await sb
    .from("purchase_payments")
    .select("*")
    .eq("document_id", params.id)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  const { data: scanFiles } = await sb.storage
    .from("purchase-scans")
    .list(params.id, { limit: 1, search: "original" });
  const hasScan = Boolean(
    scanFiles?.some((f) => f.name.startsWith("original."))
  );

  const initial: PurchaseFormValue = {
    id: doc.id,
    doc_number: doc.doc_number,
    doc_date: doc.doc_date,
    supplier_name: doc.bill_to_name ?? "",
    supplier_address: doc.bill_to_address ?? "",
    supplier_contact_person: doc.bill_to_contact_person ?? "",
    supplier_contact_number: doc.bill_to_contact_number ?? "",
    supplier_email: doc.bill_to_email ?? "",
    supplier_gst: doc.bill_to_gst ?? "",
    irn: doc.irn ?? "",
    ack_number: doc.ack_number ?? "",
    ack_date: doc.ack_date ?? "",
    place_of_supply: doc.place_of_supply ?? "",
    bilty_number: doc.bilty_number ?? "",
    vehicle_number: doc.vehicle_number ?? "",
    tax_type: doc.tax_type,
    tax_rate: Number(doc.tax_rate),
    additional_charges: doc.additional_charges ?? [],
    taxable_charges: doc.taxable_charges ?? [],
    remarks: doc.remarks ?? "",
    status: doc.status,
    items: (items ?? []).map((it) => ({
      description: it.description,
      size: it.size ?? "",
      hsn_code: it.hsn_code ?? "",
      qty: Number(it.qty),
      unit: it.unit ?? "mts",
      rate: Number(it.rate),
      thickness: Number(it.thickness ?? 0),
      width_mm: Number(it.width_mm ?? 0),
      length_mm: Number(it.length_mm ?? 0),
      pcs: Number(it.pcs ?? 0),
    })),
  };

  return (
    <div className="space-y-7">
      <a
        href="/purchases"
        className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
      >
        <span>&larr;</span> Back to Purchases
      </a>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-600">Edit purchase</p>
          <h1 className="page-title">Purchase — {doc.doc_number}</h1>
          <p className="page-subtitle">
            Created {formatDateReadable(doc.created_at)}
          </p>
        </div>
        <div className="shrink-0 pt-1">
          <StatusBadge
            documentId={doc.id}
            currentStatus={doc.status}
            docType="purchase"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/api/purchases/${doc.id}/pdf`}
          target="_blank"
          className="btn-secondary text-sm"
        >
          View PDF
        </Link>
        <a
          href={`/api/purchases/${doc.id}/pdf`}
          download={`${doc.doc_number}.pdf`}
          className="btn-secondary text-sm"
        >
          Download PDF
        </a>
        <PurchaseScanManager purchaseId={doc.id} hasScan={hasScan} />
      </div>
      <PurchasePayments
        documentId={doc.id}
        totalAmount={doc.total_amount}
        payments={(payments ?? []) as PurchasePayment[]}
      />

      {doc.bill_to_name && (
        <section className="card p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Supplier purchase ledger</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Share all purchases and payments with {doc.bill_to_name} as a
              single statement.
            </p>
          </div>
          <LedgerShareActions
            kind="supplier"
            ledgerId={doc.bill_to_name}
            partyName={doc.bill_to_name}
            contactNumber={doc.bill_to_contact_number}
          />
        </section>
      )}

      <PurchaseForm initial={initial} />
    </div>
  );
}
