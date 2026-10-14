"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import CalendarInput from "@/components/CalendarInput";
import Modal from "@/components/Modal";
import PaymentModeField from "@/components/accounts/PaymentModeField";
import { inr } from "@/lib/format";
import { amountInWords } from "@/lib/amountInWords";

interface Props {
  customerId: string;
  balanceDue: number;
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

export default function PaymentModal({ customerId, balanceDue }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(localToday());
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<string>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [generateReceipt, setGenerateReceipt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const parsed = parseFloat(amount);
  const validAmount = Number.isFinite(parsed) && parsed > 0;
  const dateDiff = daysFromToday(paymentDate);
  const dateStale = dateDiff !== null && Math.abs(dateDiff) > 7;

  function resetForm() {
    setPaymentDate(localToday());
    setAmount("");
    setMode("cash");
    setReference("");
    setNotes("");
    setGenerateReceipt(true);
    setError("");
  }

  function close() {
    if (!saving) setOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (parsed > balanceDue) {
      setError(
        `Amount (${inr(parsed)}) exceeds balance due (${inr(balanceDue)}).`
      );
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

  const cta = saving
    ? "Saving…"
    : validAmount
      ? `Record ${inr(parsed)}${generateReceipt ? " + Receipt" : ""}`
      : generateReceipt
        ? "Record + Receipt"
        : "Record Payment";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary w-full inline-flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path
            fillRule="evenodd"
            d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
            clipRule="evenodd"
          />
        </svg>
        Record Payment
      </button>

      <Modal
        open={open}
        onClose={close}
        onSubmit={handleSubmit}
        title="Record Payment"
        description={
          <>
            Balance due:{" "}
            <span
              className={`font-semibold ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}
            >
              {inr(Math.abs(balanceDue))}
            </span>
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
              disabled={saving}
              className="btn-primary disabled:opacity-50 sm:min-w-[220px]"
            >
              {cta}
            </button>
          </div>
        }
      >
        <div>
          <label className={SENIOR_LABEL} htmlFor="pay-amount">
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500">
              ₹
            </span>
            <input
              id="pay-amount"
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
          <label className={SENIOR_LABEL} htmlFor="pay-ref">
            Reference number{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="pay-ref"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="input"
            placeholder="Cheque no, UTR, UPI ref..."
            autoComplete="off"
          />
        </div>

        <div>
          <label className={SENIOR_LABEL} htmlFor="pay-notes">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="pay-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input"
          />
        </div>

        <label className="flex items-start gap-3 rounded-xl bg-brand-50/50 border border-brand-100 px-4 py-3 cursor-pointer hover:bg-brand-50 transition">
          <input
            type="checkbox"
            checked={generateReceipt}
            onChange={(e) => setGenerateReceipt(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-700">
              Generate receipt
            </span>
            <span className="mt-0.5 block text-sm text-slate-500">
              A receipt will be created and can be shared with the customer.
            </span>
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </Modal>
    </>
  );
}
