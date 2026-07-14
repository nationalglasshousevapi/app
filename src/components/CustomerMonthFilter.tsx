"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CustomerMonthFilter({
  currentMonth,
  customerId,
}: {
  currentMonth: string;
  customerId: string;
}) {
  const router = useRouter();
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonth || defaultMonth);

  function applyFilter() {
    router.push(`/customers/${customerId}?month=${month}`);
  }

  function clearFilter() {
    setMonth(defaultMonth);
    router.push(`/customers/${customerId}`);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <button
        onClick={applyFilter}
        className="rounded bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
      >
        Filter
      </button>
      {currentMonth && (
        <button
          onClick={clearFilter}
          className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
        >
          Clear
        </button>
      )}
    </div>
  );
}
