"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import { inr } from "@/lib/format";
import { computeTax, computeTotal } from "@/lib/documents";

export default function ConvertDialog({
  open,
  documentId,
  docNumber,
  docType,
  totalAmount,
  onCancel,
}: {
  open: boolean;
  documentId: string;
  docNumber: string;
  docType?: string;
  totalAmount: number;
  onCancel: () => void;
}) {
  // Orders often already have an advance recorded at sale time; converting to an
  // invoice is about paperwork, not payment. Default to no payment for orders,
  // keep "record payment now" for quotations/estimates.
  const isOrder = docType === "order";
  const [recordPayment, setRecordPayment] = useState(!isOrder);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // GST-on-conversion: orders now default to No GST; customer may request GST invoice.
  const [withGst, setWithGst] = useState(false);
  const [gstType, setGstType] = useState<"cgst_sgst" | "igst">("cgst_sgst");
  const [sourceTaxType, setSourceTaxType] = useState<string | null>(null);
  const [sourceSubtotal, setSourceSubtotal] = useState<number | null>(null);
  const [sourceDiscount, setSourceDiscount] = useState(0);
  const [sourceTaxableCharges, setSourceTaxableCharges] = useState<{ label: string; amount: number }[]>([]);
  const [sourceAdditionalCharges, setSourceAdditionalCharges] = useState<{ label: string; amount: number }[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    setError("");
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
            setSourceTaxableCharges(Array.isArray(d.taxable_charges) ? d.taxable_charges : []);
            setSourceAdditionalCharges(Array.isArray(d.additional_charges) ? d.additional_charges : []);
          }
        })
        .catch(() => {})
        .finally(() => setSourceLoading(false));
    } else {
      // For non-orders, assume GST already included if any; no need to fetch
      setSourceTaxType(null);
    }
  }, [open, isOrder, docType, documentId, totalAmount]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  async function convert() {
    if (converting) return;
    setConverting(true);
    setError("");
    try {
      const wantsGst = isOrder && sourceTaxType === "none" && withGst;
      const res = await fetch("/api/documents/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: documentId,
          record_payment: recordPayment,
          payment_mode: recordPayment ? paymentMode : undefined,
          ...(wantsGst ? { with_gst: true, gst_type: gstType } : {}),
        }),
      });
      const json = await res.json();
      if (res.ok && json.document) {
        onCancel();
        router.push(`/documents/${json.document.id}`);
        router.refresh();
      } else {
        setError(json.error || "Could not convert to invoice.");
      }
    } catch {
      setError("Could not convert. Check your connection.");
    } finally {
      setConverting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={converting ? undefined : onCancel}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Convert to Invoice"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-sm w-full mx-4"
          >
            <h3 className="font-display font-bold text-lg text-ink mb-1">
              Convert to Invoice
            </h3>
            <p className="text-sm text-slate-500 font-body mb-4">
              {docNumber} → a new invoice with a fresh number. Customer details,
              tax settings and line items are copied.
            </p>

            {/* GST toggle for Orders without GST — add 18% when invoicing */}
            {isOrder && sourceTaxType === "none" && (
              <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withGst}
                    onChange={(e) => setWithGst(e.target.checked)}
                    className="accent-brand-500 w-4 h-4"
                  />
                  <div>
                    <span className="block text-sm font-medium text-slate-800">Add GST to invoice</span>
                    <span className="block text-xs text-slate-400">Order is without GST — add 18% when the customer needs a billed invoice</span>
                  </div>
                </label>
                {withGst && (
                  <div className="space-y-2 pl-7">
                    <label className="label">GST type</label>
                    <select className="input" value={gstType} onChange={(e) => setGstType(e.target.value as "cgst_sgst" | "igst")}>
                      <option value="cgst_sgst">CGST + SGST (9% + 9%)</option>
                      <option value="igst">IGST (18%)</option>
                    </select>
                    {sourceSubtotal !== null && (() => {
                      const taxable = computeTax(sourceSubtotal, gstType, 0.18, sourceDiscount, sourceTaxableCharges);
                      const { totalAmount: newTotal } = computeTotal(sourceSubtotal, taxable.cgst, taxable.sgst, taxable.igst, sourceDiscount, sourceAdditionalCharges, sourceTaxableCharges);
                      const gstAmt = taxable.cgst + taxable.sgst + taxable.igst;
                      return (
                        <div className="rounded-lg bg-white border border-brand-100 px-3 py-2 text-xs space-y-1">
                          <div className="flex justify-between"><span className="text-slate-500">Order total (no GST)</span><span className="font-mono font-semibold">{inr(totalAmount, 2)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">GST {gstType === "igst" ? "@ 18%" : "@ 9%+9%"}</span><span className="font-mono font-semibold">{inr(gstAmt, 2)}</span></div>
                          <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-ink"><span>Invoice total</span><span className="font-mono">{inr(newTotal, 2)}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            {isOrder && sourceTaxType && sourceTaxType !== "none" && (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3">
                This order already includes {sourceTaxType === "igst" ? "IGST 18%" : "CGST + SGST 18%"} — the invoice will carry the same GST.
              </p>
            )}
            {isOrder && sourceLoading && sourceTaxType === null && (
              <p className="text-xs text-slate-400 mb-3">Loading order details…</p>
            )}

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

            {recordPayment && (
              <div className="mb-4">
                <label className="label">Payment mode</label>
                <select
                  className="input"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={converting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={convert}
                disabled={converting}
                className="btn-primary"
              >
                {converting ? "Converting…" : "Convert to Invoice"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
