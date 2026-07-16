"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
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
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={() => { if (!saving) onClose(); }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 pb-0">
            <h2 className="font-display text-xl font-bold text-ink">Edit Opening Balance</h2>
            <p className="text-sm text-slate-500 mt-1">{customerName}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="label">
                Current Balance <span className="text-slate-400 font-normal">(Rs.)</span>
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
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
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
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
