"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

export default function LedgerDateFilter({
  fromDate,
  toDate,
}: {
  fromDate?: string;
  toDate?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(fromDate || "");
  const [to, setTo] = useState(toDate || "");

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clear() {
    setFrom("");
    setTo("");
    router.push(pathname);
  }

  function setPreset(preset: "this-month" | "last-month" | "this-year" | "fy") {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    switch (preset) {
      case "this-month":
        setFrom(`${y}-${String(m + 1).padStart(2, "0")}-01`);
        setTo(today());
        break;
      case "last-month":
        setFrom(`${y}-${String(m).padStart(2, "0")}-01`);
        setTo(new Date(y, m, 0).toISOString().slice(0, 10));
        break;
      case "this-year":
        setFrom(`${y}-01-01`);
        setTo(today());
        break;
      case "fy": {
        const fyStart = m >= 3 ? y : y - 1;
        setFrom(`${fyStart}-04-01`);
        setTo(today());
        break;
      }
    }
  }

  const hasFilter = !!fromDate || !!toDate;

  return (
    <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
      <div className="flex flex-wrap items-end gap-2">
        {(["this-month", "last-month", "this-year", "fy"] as const).map((p) => {
          const labels: Record<string, string> = {
            "this-month": "This Month",
            "last-month": "Last Month",
            "this-year": "This Year",
            fy: "FY",
          };
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              {labels[p]}
            </button>
          );
        })}
        <span className="text-slate-300 mx-1 hidden sm:inline">|</span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-slate-400 text-sm">to</span>
          <div className="relative">
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z" clipRule="evenodd" />
            </svg>
          </div>
          <button
            onClick={apply}
            className="btn-primary text-sm px-4 py-2"
          >
            Apply
          </button>
          {hasFilter && (
            <button
              onClick={clear}
              className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
