"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "month" | "quarter" | "range";

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

  const [mode, setMode] = useState<Mode>(initFrom && initTo ? "range" : "month");
  const [month, setMonth] = useState(currentMonth || `${cy}-${String(cm + 1).padStart(2, "0")}`);
  const [quarter, setQuarter] = useState(`${cy}-Q${Math.floor(cm / 3) + 1}`);
  const [fromDate, setFromDate] = useState(initFrom || "");
  const [toDate, setToDate] = useState(initTo || "");

  function apply() {
    const params = new URLSearchParams();
    if (mode === "month") {
      params.set("month", month);
    } else if (mode === "quarter") {
      params.set("quarter", quarter);
    } else {
      params.set("from", fromDate);
      params.set("to", toDate);
    }
    router.push(`/customers/${customerId}?${params.toString()}`);
  }

  function clearFilter() {
    router.push(`/customers/${customerId}`);
  }

  const hasFilter = !!currentMonth || !!initFrom;

  const quickPresets = [
    { label: "This Month", month: `${cy}-${String(cm + 1).padStart(2, "0")}` },
    { label: "Last Month", month: cm === 0 ? `${cy - 1}-12` : `${cy}-${String(cm).padStart(2, "0")}` },
    { label: "This Quarter", quarter: `${cy}-Q${Math.floor(cm / 3) + 1}` },
    { label: "This Year", from: `${cy}-01-01`, to: `${cy}-12-31` },
    { label: "FY", from: cm >= 3 ? `${cy}-04-01` : `${cy - 1}-04-01`, to: cm >= 3 ? `${cy + 1}-03-31` : `${cy}-03-31` },
  ];

  function applyPreset(p: (typeof quickPresets)[number]) {
    const params = new URLSearchParams();
    if ("month" in p && p.month) {
      setMode("month");
      setMonth(p.month);
      params.set("month", p.month);
    } else if ("quarter" in p && p.quarter) {
      setMode("quarter");
      setQuarter(p.quarter);
      params.set("quarter", p.quarter);
    } else if ("from" in p && p.from) {
      setMode("range");
      setFromDate(p.from!);
      setToDate(p.to!);
      params.set("from", p.from!);
      params.set("to", p.to!);
    }
    router.push(`/customers/${customerId}?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      {/* Quick presets */}
      <div className="flex flex-wrap gap-1.5">
        {quickPresets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            className={`rounded border px-2.5 py-1.5 text-xs font-medium transition ${
              (p.label === "This Month" && !hasFilter)
                ? "border-brand-400 bg-brand-50 text-brand-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg w-fit">
        {(["month", "quarter", "range"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition capitalize ${
              mode === m
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {m === "month" ? "Month" : m === "quarter" ? "Quarter" : "Date Range"}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {mode === "month" && (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        )}
        {mode === "quarter" && (
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {Array.from({ length: 4 }, (_, i) => {
              const q = i + 1;
              const label = `Q${q}`;
              return <option key={label} value={`${cy}-Q${q}`}>{label} {cy}</option>;
            })}
            {Array.from({ length: 2 }, (_, i) => {
              const y = cy - i - 1;
              return Array.from({ length: 4 }, (_, j) => {
                const q = j + 1;
                return <option key={`${y}-Q${q}`} value={`${y}-Q${q}`}>Q{q} {y}</option>;
              });
            }).flat()}
          </select>
        )}
        {mode === "range" && (
          <>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="From"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="To"
            />
          </>
        )}
        <button
          onClick={apply}
          className="rounded bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
        >
          Filter
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
    </div>
  );
}
