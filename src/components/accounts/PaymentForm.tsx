"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import CalendarInput from "@/components/CalendarInput";
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
