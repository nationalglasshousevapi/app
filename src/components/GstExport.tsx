"use client";

import { useState } from "react";

type PeriodType = "monthly" | "yearly" | "range";
type ReportType = "invoice" | "hsn";

export default function GstExport() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const defaultYear = String(now.getFullYear());

  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [type, setType] = useState<ReportType>("invoice");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setError("");
    setDownloading(true);

    const params = new URLSearchParams();
    params.set("type", type);

    if (periodType === "monthly") {
      params.set("month", month);
    } else if (periodType === "yearly") {
      params.set("from", `${year}-01-01`);
      params.set("to", `${year}-12-31`);
    } else {
      if (!fromDate || !toDate) {
        setError("Please select both from and to dates.");
        setDownloading(false);
        return;
      }
      params.set("from", fromDate);
      params.set("to", toDate);
    }

    try {
      const res = await fetch(`/api/reports/gst?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to generate report. No invoices found for the selected period.");
        setDownloading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `gst-report-${periodType === "monthly" ? month : periodType === "yearly" ? year : `${fromDate}_${toDate}`}.csv`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const tabs: { label: string; value: PeriodType }[] = [
    { label: "Monthly", value: "monthly" },
    { label: "Yearly", value: "yearly" },
    { label: "Range", value: "range" },
  ];

  return (
    <div className="card p-5 md:p-6">
      <h2 className="font-display font-bold text-ink">GST Report</h2>
      <p className="text-sm text-slate-500 font-body mt-1">Download GSTR-1 CSV</p>

      {/* Period type tabs */}
      <div className="mt-4 flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPeriodType(tab.value)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${
              periodType === tab.value
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        {periodType === "monthly" && (
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input w-full"
            />
          </div>
        )}

        {periodType === "yearly" && (
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="input w-full"
            >
              {Array.from({ length: 10 }, (_, i) => now.getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {periodType === "range" && (
          <>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input w-full"
              />
            </div>
          </>
        )}

        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Format</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ReportType)}
            className="input w-full"
          >
            <option value="invoice">Invoice-wise</option>
            <option value="hsn">HSN-wise</option>
          </select>
        </div>

        <button
          onClick={download}
          disabled={downloading}
          className="btn-primary"
        >
          {downloading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {downloading ? "Downloading…" : "Download CSV"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
