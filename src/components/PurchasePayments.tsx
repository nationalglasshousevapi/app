"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import CalendarInput from "@/components/CalendarInput";
import Modal from "@/components/Modal";
import PaymentModeField from "@/components/accounts/PaymentModeField";
import { amountInWords } from "@/lib/amountInWords";
import { formatDateReadable, inr } from "@/lib/format";
import {
  purchasePaymentSummary,
  type PurchasePayment,
} from "@/lib/purchasePayments";
import { toast } from "@/lib/toast";

function localToday() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const LABEL = "block text-sm font-semibold text-slate-700 mb-1.5";

export default function PurchasePayments({
  documentId,
  totalAmount,
  payments,
}: {
  documentId: string;
  totalAmount: number | string;
  payments: PurchasePayment[];
}) {
  const router = useRouter();
  const summary = purchasePaymentSummary(totalAmount, payments);
  const [open, setOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(localToday());
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const parsed = parseFloat(amount);
  const validAmount = Number.isFinite(parsed) && parsed > 0;
  const remaining = Math.max(0, summary.balance);

  function close() {
    if (!saving) setOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!validAmount) {
      setError("Enter a valid amount.");
      return;
    }
    if (parsed > remaining + 0.005) {
      setError(`Amount exceeds the balance payable (${inr(remaining)}).`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/purchase-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          payment_date: paymentDate,
          amount: parsed,
          payment_mode: mode,
          reference_number: reference || null,
          notes: notes || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save payment.");

      setPaymentDate(localToday());
      setAmount("");
      setMode("cash");
      setReference("");
      setNotes("");
      setOpen(false);
      toast.success("Payment recorded.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(payment: PurchasePayment) {
    if (
      !window.confirm(`Delete this ${inr(Number(payment.amount))} payment?`)
    ) {
      return;
    }
    setDeletingId(payment.id);
    try {
      const res = await fetch(`/api/purchase-payments/${payment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not delete the payment.");
      }
      toast.success("Payment deleted.");
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete the payment."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="card p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Supplier payments</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Track what has been paid against this purchase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={summary.balance <= 0}
          className="btn-primary text-sm disabled:opacity-50"
        >
          + Record payment
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Purchase total
          </p>
          <p className="mt-1 text-lg font-semibold">{inr(summary.total)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Paid
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-800">
            {inr(summary.totalPaid)}
          </p>
        </div>
        <div
          className={`rounded-xl border p-4 ${
            summary.balance > 0
              ? "border-amber-200 bg-amber-50/60"
              : "border-emerald-200 bg-emerald-50/60"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              summary.balance > 0 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {summary.balance < 0 ? "Advance paid" : "Balance payable"}
          </p>
          <p
            className={`mt-1 text-lg font-semibold ${
              summary.balance > 0 ? "text-amber-800" : "text-emerald-800"
            }`}
          >
            {inr(Math.abs(summary.balance))}
          </p>
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Reference</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-slate-100">
                  <td className="p-3 whitespace-nowrap">
                    {formatDateReadable(payment.payment_date)}
                  </td>
                  <td className="p-3">
                    {payment.payment_mode.replace(/_/g, " ")}
                  </td>
                  <td className="p-3 text-slate-500">
                    <div>{payment.reference_number || "—"}</div>
                    {payment.notes && (
                      <div className="text-xs text-slate-400">
                        {payment.notes}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {inr(Number(payment.amount))}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => deletePayment(payment)}
                      disabled={deletingId === payment.id}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === payment.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No payments recorded yet.</p>
      )}

      <Modal
        open={open}
        onClose={close}
        onSubmit={handleSubmit}
        title="Record supplier payment"
        description={
          <>
            Balance payable:{" "}
            <span className="font-semibold">{inr(remaining)}</span>
          </>
        }
        closeOnBackdrop={false}
        busy={saving}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !validAmount}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? "Saving…" : "Record payment"}
            </button>
          </div>
        }
      >
        <div>
          <label className={LABEL} htmlFor="purchase-pay-amount">
            Amount
          </label>
          <input
            id="purchase-pay-amount"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
            placeholder="0.00"
            required
            autoFocus
          />
          {validAmount && (
            <p className="mt-1.5 text-sm font-medium text-slate-600">
              {amountInWords(parsed)}
            </p>
          )}
        </div>

        <div>
          <label className={LABEL}>Payment date</label>
          <CalendarInput
            value={paymentDate}
            onChange={setPaymentDate}
            required
          />
        </div>

        <div>
          <span className={LABEL}>How was it paid?</span>
          <PaymentModeField value={mode} onChange={setMode} />
        </div>

        <div>
          <label className={LABEL} htmlFor="purchase-pay-ref">
            Reference number{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="purchase-pay-ref"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="input"
            placeholder="Cheque no, UTR, UPI ref..."
            autoComplete="off"
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="purchase-pay-notes">
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="purchase-pay-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </Modal>
    </section>
  );
}
