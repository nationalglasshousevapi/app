"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import CalendarInput from "@/components/CalendarInput";
import { inr } from "@/lib/format";

interface Props {
  customerId: string;
  balanceDue: number;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function PaymentModal({ customerId, balanceDue }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<string>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [generateReceipt, setGenerateReceipt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setPaymentDate(today());
    setAmount("");
    setMode("cash");
    setReference("");
    setNotes("");
    setGenerateReceipt(true);
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (parsed > balanceDue) {
      setError(`Amount (${inr(parsed)}) exceeds balance due (${inr(balanceDue)}).`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          payment_date: paymentDate,
          amount: parsed,
          payment_mode: mode,
          reference_number: reference || null,
          notes: notes || null,
          generate_receipt: generateReceipt,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save payment.");
      }

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary w-full inline-flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
        </svg>
        Record Payment
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => { if (!saving) setOpen(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-0">
              <h2 className="font-display text-xl font-bold text-ink">
                Record Payment
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Balance due:{" "}
                <span className={`font-semibold ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
                  {inr(Math.abs(balanceDue))}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                <CalendarInput value={paymentDate} onChange={setPaymentDate} required />
              </div>

              <div>
                <label className="label">Payment Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="input"
                >
                  {PAYMENT_MODES.map((pm) => (
                    <option key={pm.value} value={pm.value}>{pm.label}</option>
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

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 rounded-xl bg-brand-50/50 border border-brand-100 px-4 py-3 cursor-pointer hover:bg-brand-50 transition">
                <input
                  type="checkbox"
                  checked={generateReceipt}
                  onChange={(e) => setGenerateReceipt(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <div>
                  <span className="font-semibold">Generate Receipt</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    A receipt will be created and can be shared with the customer.
                  </p>
                </div>
              </label>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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
                  {saving ? "Saving..." : generateReceipt ? "Record & Generate Receipt" : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
