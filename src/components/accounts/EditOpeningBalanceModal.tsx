"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { inr } from "@/lib/format";

interface EditOpeningBalanceModalProps {
  customerId: string;
  currentBalance: number;
  customerName: string;
  onClose: () => void;
}

export default function EditOpeningBalanceModal({
  customerId,
  currentBalance,
  customerName,
  onClose,
}: EditOpeningBalanceModalProps) {
  const router = useRouter();
  const [value, setValue] = useState(String(currentBalance));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      setError("Enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opening_balance: parsed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update opening balance.");
      }

      onClose();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      onClose={() => {
        if (!saving) onClose();
      }}
      onSubmit={handleSubmit}
      title="Edit Opening Balance"
      description={customerName}
      closeOnBackdrop={false}
      busy={saving}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
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
      }
    >
      <div>
        <label className="label">
          Current Balance{" "}
          <span className="text-slate-400 font-normal">(Rs.)</span>
        </label>
        <div className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 font-medium">
          {inr(Math.abs(currentBalance))} {currentBalance > 0 ? "Dr" : "Cr"}
        </div>
      </div>

      <div>
        <label className="label">
          New Opening Balance{" "}
          <span className="text-slate-400 font-normal">
            (positive = customer owes you, negative = you owe customer)
          </span>
        </label>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input"
          placeholder="0.00"
          required
          autoFocus
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </Modal>
  );
}
