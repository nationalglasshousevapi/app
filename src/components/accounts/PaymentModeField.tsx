"use client";

import { PAYMENT_MODES } from "@/lib/paymentModes";

const QUICK_MODES = [
  { value: "cash", label: "Cash", hint: "Notes / coins" },
  { value: "upi", label: "UPI", hint: "GPay / PhonePe" },
  { value: "bank_transfer", label: "Bank", hint: "NEFT / IMPS" },
] as const;

export default function PaymentModeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const isQuick = QUICK_MODES.some((m) => m.value === value);
  const otherLabel = !isQuick
    ? PAYMENT_MODES.find((m) => m.value === value)?.label
    : undefined;

  return (
    <div>
      <div
        className="grid grid-cols-3 gap-2"
        role="radiogroup"
        aria-label="Payment mode"
      >
        {QUICK_MODES.map((m) => {
          const selected = value === m.value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(m.value)}
              className={`min-h-[56px] rounded-xl border-2 px-2 py-2 text-center transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
                selected
                  ? "border-brand-600 bg-brand-50/60 text-ink"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="block text-base font-bold leading-tight">
                {m.label}
              </span>
              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                {m.hint}
              </span>
            </button>
          );
        })}
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700">
          {otherLabel
            ? `Other: ${otherLabel} — change`
            : "Other mode (Cheque, Adjustment…)"}
        </summary>
        <select
          value={isQuick ? "" : value}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          className="input mt-2"
          aria-label="Other payment mode"
        >
          <option value="" disabled>
            Choose other mode…
          </option>
          {PAYMENT_MODES.filter(
            (m) => !QUICK_MODES.some((q) => q.value === m.value)
          ).map((pm) => (
            <option key={pm.value} value={pm.value}>
              {pm.label}
            </option>
          ))}
        </select>
      </details>
    </div>
  );
}
