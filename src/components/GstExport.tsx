"use client";

import { useState } from "react";

export default function GstExport() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [type, setType] = useState<"invoice" | "hsn">("invoice");

  function download() {
    window.open(`/api/reports/gst?month=${month}&type=${type}`, "_blank");
  }

  return (
    <div className="card p-5 md:p-6">
      <h2 className="font-display font-bold text-ink">GST Report</h2>
      <p className="text-sm text-slate-500 font-body mt-1">Download GSTR-1 CSV</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Format</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "invoice" | "hsn")}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="invoice">Invoice-wise</option>
            <option value="hsn">HSN-wise</option>
          </select>
        </div>
        <button
          onClick={download}
          className="whitespace-nowrap rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
        >
          Download CSV
        </button>
      </div>
    </div>
  );
}
