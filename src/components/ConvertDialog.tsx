"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PaymentModeField from "@/components/accounts/PaymentModeField";
import { inr } from "@/lib/format";
import { computeTax, computeTotal } from "@/lib/documents";
import { docTypeLabel } from "@/lib/docTypes";
import Modal from "@/components/Modal";

export default function ConvertDialog({
  open,
  documentId,
  docNumber,
  docType,
  totalAmount,
  targets,
  onCancel,
}: {
  open: boolean;
  documentId: string;
  docNumber: string;
  docType?: string;
  totalAmount: number;
  targets: string[];
  onCancel: () => void;
}) {
  const isOrder = docType === "order";
  const [targetType, setTargetType] = useState("invoice");
  const [recordPayment, setRecordPayment] = useState(!isOrder);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const isInvoiceTarget = targetType === "invoice";

  // GST-on-conversion: orders now default to No GST; customer may request GST invoice.
  const [withGst, setWithGst] = useState(false);
  const [gstType, setGstType] = useState<"cgst_sgst" | "igst">("cgst_sgst");
  const [sourceTaxType, setSourceTaxType] = useState<string | null>(null);
  const [sourceSubtotal, setSourceSubtotal] = useState<number | null>(null);
  const [sourceDiscount, setSourceDiscount] = useState(0);
  const [sourceTaxableCharges, setSourceTaxableCharges] = useState<
    { label: string; amount: number }[]
  >([]);
  const [sourceAdditionalCharges, setSourceAdditionalCharges] = useState<
    { label: string; amount: number }[]
  >([]);
  const [sourceLoading, setSourceLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setTargetType(
      targets.includes("invoice") ? "invoice" : (targets[0] ?? "invoice")
    );
    setRecordPayment(!isOrder);
    setWithGst(false);
    setGstType("cgst_sgst");
    setSourceTaxType(null);
    setSourceSubtotal(null);
    setSourceAdditionalCharges([]);
    setSourceTaxableCharges([]);
    setSourceDiscount(0);

    if (docType === "order") {
      setSourceLoading(true);
      fetch(`/api/documents/${documentId}`)
        .then((r) => r.json())
        .then((json) => {
          const d = json.document;
          if (d) {
            setSourceTaxType(d.tax_type ?? "none");
            setSourceSubtotal(Number(d.subtotal ?? totalAmount));
            setSourceDiscount(Number(d.discount_amount ?? 0));
            setSourceTaxableCharges(
              Array.isArray(d.taxable_charges) ? d.taxable_charges : []
            );
            setSourceAdditionalCharges(
              Array.isArray(d.additional_charges) ? d.additional_charges : []
            );
          }
        })
        .catch(() => {})
        .finally(() => setSourceLoading(false));
    } else {
      setSourceTaxType(null);
    }
  }, [open, isOrder, docType, documentId, totalAmount, targets]);

  async function convert() {
    if (converting) return;
    setConverting(true);
    setError("");
    try {
      const wantsGst =
        isInvoiceTarget && isOrder && sourceTaxType === "none" && withGst;
      const res = await fetch("/api/documents/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: documentId,
          to_type: targetType,
          record_payment: isInvoiceTarget ? recordPayment : false,
          payment_mode:
            isInvoiceTarget && recordPayment ? paymentMode : undefined,
          ...(wantsGst ? { with_gst: true, gst_type: gstType } : {}),
        }),
      });
      const json = await res.json();
      if (res.ok && json.document) {
        onCancel();
        router.push(`/documents/${json.document.id}`);
        router.refresh();
      } else {
        setError(json.error || "Could not convert document.");
      }
    } catch {
      setError("Could not convert. Check your connection.");
    } finally {
      setConverting(false);
    }
  }

  const targetLabel = docTypeLabel(targetType);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Convert document"
      description={
        <>
          {docNumber} → a new {targetLabel.toLowerCase()} with a fresh number.
          Customer details, tax settings and line items are copied.
        </>
      }
      maxWidth="sm"
      busy={converting}
      bodyClassName=""
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={converting}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={convert}
            disabled={converting}
            className="btn-primary"
          >
            {converting ? "Converting…" : `Convert to ${targetLabel}`}
          </button>
        </div>
      }
    >
      <div className="mb-4">
        <label className="label-lg">Convert to</label>
        <select
          className="input"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
        >
          {targets.map((t) => (
            <option key={t} value={t}>
              {docTypeLabel(t)}
            </option>
          ))}
        </select>
      </div>

      {/* GST toggle for Orders without GST — add 18% when invoicing */}
      {isInvoiceTarget && isOrder && sourceTaxType === "none" && (
        <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={withGst}
              onChange={(e) => setWithGst(e.target.checked)}
              className="accent-brand-500 w-4 h-4"
            />
            <div>
              <span className="block text-sm font-medium text-slate-800">
                Add GST to invoice
              </span>
              <span className="block text-xs text-slate-400">
                Order is without GST — add 18% when the customer needs a billed
                invoice
              </span>
            </div>
          </label>
          {withGst && (
            <div className="space-y-2 pl-7">
              <label className="label-lg">GST type</label>
              <select
                className="input"
                value={gstType}
                onChange={(e) =>
                  setGstType(e.target.value as "cgst_sgst" | "igst")
                }
              >
                <option value="cgst_sgst">CGST + SGST (9% + 9%)</option>
                <option value="igst">IGST (18%)</option>
              </select>
              {sourceSubtotal !== null &&
                (() => {
                  const taxable = computeTax(
                    sourceSubtotal,
                    gstType,
                    0.18,
                    sourceDiscount,
                    sourceTaxableCharges
                  );
                  const { totalAmount: newTotal } = computeTotal(
                    sourceSubtotal,
                    taxable.cgst,
                    taxable.sgst,
                    taxable.igst,
                    sourceDiscount,
                    sourceAdditionalCharges,
                    sourceTaxableCharges
                  );
                  const gstAmt = taxable.cgst + taxable.sgst + taxable.igst;
                  return (
                    <div className="rounded-lg bg-white border border-brand-100 px-3 py-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Order total (no GST)
                        </span>
                        <span className="font-mono font-semibold">
                          {inr(totalAmount, 2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          GST {gstType === "igst" ? "@ 18%" : "@ 9%+9%"}
                        </span>
                        <span className="font-mono font-semibold">
                          {inr(gstAmt, 2)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-ink">
                        <span>Invoice total</span>
                        <span className="font-mono">{inr(newTotal, 2)}</span>
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}
        </div>
      )}
      {isInvoiceTarget &&
        isOrder &&
        sourceTaxType &&
        sourceTaxType !== "none" && (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3">
            This order already includes{" "}
            {sourceTaxType === "igst" ? "IGST 18%" : "CGST + SGST 18%"} — the
            invoice will carry the same GST.
          </p>
        )}
      {isInvoiceTarget &&
        isOrder &&
        sourceLoading &&
        sourceTaxType === null && (
          <p className="text-xs text-slate-400 mb-3">Loading order details…</p>
        )}

      {isInvoiceTarget && (
        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={recordPayment}
            onChange={(e) => setRecordPayment(e.target.checked)}
            className="accent-brand-500 w-4 h-4"
          />
          <div>
            <span className="block text-sm font-medium text-slate-800">
              Record {isOrder ? "balance" : "cash"} payment now
            </span>
            <span className="block text-xs text-slate-400">
              {isOrder
                ? "Only if the remaining balance is being paid now — also creates a receipt"
                : `${inr(totalAmount)} — also creates a receipt, invoice marked paid`}
            </span>
          </div>
        </label>
      )}

      {isInvoiceTarget && recordPayment && (
        <div className="mb-4">
          <span className="label-lg">How was it paid?</span>
          <PaymentModeField value={paymentMode} onChange={setPaymentMode} />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}
    </Modal>
  );
}
