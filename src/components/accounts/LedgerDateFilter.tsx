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

  const hasFilter = !!fromDate || !!toDate;

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Date From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Date To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <button
        onClick={apply}
        className="rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Apply
      </button>
      {hasFilter && (
        <button
          onClick={clear}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          Clear
        </button>
      )}
    </div>
  );
}
