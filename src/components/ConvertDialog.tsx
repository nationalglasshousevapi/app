"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import { inr } from "@/lib/format";

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

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    setError("");
    setRecordPayment(!isOrder);
  }, [open, isOrder]);

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
      const res = await fetch("/api/documents/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: documentId,
          record_payment: recordPayment,
          payment_mode: recordPayment ? paymentMode : undefined,
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
