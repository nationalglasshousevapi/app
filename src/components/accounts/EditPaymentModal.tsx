"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import CalendarInput from "@/components/CalendarInput";
import Modal from "@/components/Modal";
import PaymentModeField from "@/components/accounts/PaymentModeField";
import { inr } from "@/lib/format";
import { amountInWords } from "@/lib/amountInWords";

interface EditPaymentModalProps {
  payment: {
    id: string;
    payment_date: string;
    amount: number;
    payment_mode: string;
    reference_number: string | null;
    notes: string | null;
  };
  onClose: () => void;
}

function localToday() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function daysFromToday(ymd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const a = new Date(ymd + "T12:00:00");
  const b = new Date(localToday() + "T12:00:00");
  if (isNaN(a.getTime())) return null;
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

const SENIOR_LABEL = "block text-sm font-semibold text-slate-700 mb-1.5";

export default function EditPaymentModal({
  payment,
  onClose,
}: EditPaymentModalProps) {
  const router = useRouter();
  const [paymentDate, setPaymentDate] = useState(payment.payment_date);
  const [amount, setAmount] = useState(String(payment.amount));
  const [mode, setMode] = useState(payment.payment_mode);
  const [reference, setReference] = useState(payment.reference_number ?? "");
  const [notes, setNotes] = useState(payment.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const busy = saving || deleting;
  const parsed = parseFloat(amount);
  const validAmount = Number.isFinite(parsed) && parsed > 0;
  const dateDiff = daysFromToday(paymentDate);
  const dateStale = dateDiff !== null && Math.abs(dateDiff) > 7;

  function close() {
    if (!busy) onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_date: paymentDate,
          amount: parsed,
          payment_mode: mode,
          reference_number: reference || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update payment.");
      }

      onClose();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete payment.");
      }
      onClose();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      onClose={close}
      onSubmit={confirmDelete ? undefined : handleSubmit}
      title={confirmDelete ? "Delete Payment" : "Edit Payment"}
      closeOnBackdrop={false}
      busy={busy}
      footer={
        confirmDelete ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete Payment"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn-danger text-sm"
            >
              Delete
            </button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
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
                disabled={saving}
                className="btn-primary disabled:opacity-50 sm:min-w-[200px]"
              >
                {saving
                  ? "Saving…"
                  : validAmount
                    ? `Save ${inr(parsed)}`
                    : "Save Changes"}
              </button>
            </div>
          </div>
        )
      }
    >
      {confirmDelete ? (
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this payment of{" "}
          <strong>{inr(payment.amount, 2)}</strong>?
        </p>
      ) : (
        <>
          <div>
            <label className={SENIOR_LABEL} htmlFor="edit-pay-amount">
              Amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500">
                ₹
              </span>
              <input
                id="edit-pay-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input pl-9 text-lg font-semibold"
                placeholder="0.00"
                required
                autoFocus
              />
            </div>
            {validAmount && (
              <p className="mt-1.5 text-sm font-medium text-slate-600">
                {amountInWords(parsed)}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Payment date
              </label>
              <button
                type="button"
                onClick={() => setPaymentDate(localToday())}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-brand-600 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                Today
              </button>
            </div>
            <CalendarInput
              value={paymentDate}
              onChange={setPaymentDate}
              required
            />
            {dateStale && dateDiff !== null && (
              <p className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-medium text-amber-800">
                {dateDiff > 0
                  ? `Date is ${dateDiff} days in the future — double-check?`
                  : `Date is ${Math.abs(dateDiff)} days ago — double-check?`}
              </p>
            )}
          </div>

          <div>
            <span className={SENIOR_LABEL}>How was it paid?</span>
            <PaymentModeField value={mode} onChange={setMode} />
          </div>

          <div>
            <label className={SENIOR_LABEL} htmlFor="edit-pay-ref">
              Reference number{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="edit-pay-ref"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="input"
              placeholder="Cheque no, UTR, UPI ref..."
              autoComplete="off"
            />
          </div>

          <div>
            <label className={SENIOR_LABEL} htmlFor="edit-pay-notes">
              Notes{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="edit-pay-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input"
            />
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </Modal>
  );
}
