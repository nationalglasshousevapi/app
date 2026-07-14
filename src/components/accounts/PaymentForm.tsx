"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import { inr } from "@/lib/format";

interface Props {
  customerId: string;
  balanceDue: number;
  onDone?: () => void;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function PaymentForm({ customerId, balanceDue, onDone }: Props) {
  const router = useRouter();
  const [paymentDate, setPaymentDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<string>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save payment.");
      }

      setPaymentDate(today());
      setAmount("");
      setMode("cash");
      setReference("");
      setNotes("");
      router.refresh();
      onDone?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        />
      </div>

      <div>
        <label className="label">Payment Date</label>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="input w-full pl-9"
              required
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z" clipRule="evenodd" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => setPaymentDate(today())}
            className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition whitespace-nowrap"
          >
            Today
          </button>
        </div>
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
          Reference Number <span className="text-slate-400 font-normal">(optional)</span>
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
          Notes <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="input"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="btn-primary w-full"
      >
        {saving ? "Saving..." : "Record Payment"}
      </button>
    </form>
  );
}
