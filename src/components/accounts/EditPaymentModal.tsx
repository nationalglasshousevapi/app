"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import CalendarInput from "@/components/CalendarInput";
import Modal from "@/components/Modal";
import { inr } from "@/lib/format";

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = parseFloat(amount);
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
      onClose={() => {
        if (!busy) onClose();
      }}
      onSubmit={confirmDelete ? undefined : handleSubmit}
      title={confirmDelete ? "Delete Payment" : "Edit Payment"}
      closeOnBackdrop={false}
      busy={busy}
      footer={
        confirmDelete ? (
          <div className="flex justify-end gap-3">
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
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn-danger text-sm"
            >
              Delete
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
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
            <label className="label">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Payment Date</label>
            <CalendarInput
              value={paymentDate}
              onChange={setPaymentDate}
              required
            />
          </div>

          <div>
            <label className="label">Payment Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="input"
            >
              {PAYMENT_MODES.map((pm) => (
                <option key={pm.value} value={pm.value}>
                  {pm.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              Reference Number{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="input"
              placeholder="Cheque no, UTR, UPI ref..."
            />
          </div>

          <div>
            <label className="label">
              Notes{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
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
