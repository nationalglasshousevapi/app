"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  currentMonth?: string;
  fromDate?: string;
  toDate?: string;
  customerId: string;
}

export default function CustomerMonthFilter({
  currentMonth,
  fromDate: initFrom,
  toDate: initTo,
  customerId,
}: Props) {
  const router = useRouter();
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth(); // 0-indexed

  const [customFrom, setCustomFrom] = useState(initFrom || "");
  const [customTo, setCustomTo] = useState(initTo || "");
  const [showCustom, setShowCustom] = useState(!!initFrom || !!initTo);

  const hasFilter = !!currentMonth || !!initFrom;

  const presets = [
    { label: "This Month", month: `${cy}-${String(cm + 1).padStart(2, "0")}` },
    { label: "Last Month", month: cm === 0 ? `${cy - 1}-12` : `${cy}-${String(cm).padStart(2, "0")}` },
    { label: "This Quarter", quarter: `${cy}-Q${Math.floor(cm / 3) + 1}` },
    { label: "This Year", from: `${cy}-01-01`, to: `${cy}-12-31` },
    { label: "FY", from: cm >= 3 ? `${cy}-04-01` : `${cy - 1}-04-01`, to: cm >= 3 ? `${cy + 1}-03-31` : `${cy}-03-31` },
  ];

  function applyPreset(p: (typeof presets)[number]) {
    const params = new URLSearchParams();
    if ("month" in p && p.month) {
      params.set("month", p.month);
    } else if ("quarter" in p && p.quarter) {
      params.set("quarter", p.quarter);
    } else if ("from" in p && p.from) {
      params.set("from", p.from!);
      params.set("to", p.to!);
    }
    setShowCustom(false);
    router.push(`/customers/${customerId}?${params.toString()}`);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    const params = new URLSearchParams();
    params.set("from", customFrom);
    params.set("to", customTo);
    router.push(`/customers/${customerId}?${params.toString()}`);
  }

  function clearFilter() {
    setShowCustom(false);
    setCustomFrom("");
    setCustomTo("");
    router.push(`/customers/${customerId}`);
  }

  return (
    <div className="space-y-3">
      {/* Quick presets — always visible */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            className={`rounded border px-2.5 py-1.5 text-xs font-medium transition ${
              (p.label === "This Month" && !hasFilter)
                ? "border-brass-400 bg-brass-50 text-brass-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={`rounded border px-2.5 py-1.5 text-xs font-medium transition ${
            showCustom
              ? "border-brass-400 bg-brass-50 text-brass-700"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Custom
        </button>
      </div>

      {/* Custom range — only when toggled */}
      {showCustom && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="From"
          />
          <span className="text-slate-400 text-sm">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="To"
          />
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            className="btn-primary text-sm px-4 py-2"
          >
            Apply
          </button>
          {hasFilter && (
            <button
              onClick={clearFilter}
              className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
