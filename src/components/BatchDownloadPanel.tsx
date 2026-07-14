"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";

const MONTHS = [
  { n: 1, label: "Jan" },
  { n: 2, label: "Feb" },
  { n: 3, label: "Mar" },
  { n: 4, label: "Apr" },
  { n: 5, label: "May" },
  { n: 6, label: "Jun" },
  { n: 7, label: "Jul" },
  { n: 8, label: "Aug" },
  { n: 9, label: "Sep" },
  { n: 10, label: "Oct" },
  { n: 11, label: "Nov" },
  { n: 12, label: "Dec" },
];

export default function BatchDownloadPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const curYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => curYear - i);

  const initialYear = searchParams.get("year") || "";
  const initialMonths = searchParams.get("months")?.split(",").map(Number).filter(Boolean) || [];
  const initialType = searchParams.get("type") || "";

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(initialMonths);
  const [selectedType, setSelectedType] = useState(initialType);
  const [downloading, setDownloading] = useState(false);

  const toggleMonth = useCallback((m: number) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedMonths(MONTHS.map((m) => m.n));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedMonths([]);
  }, []);

  const applyFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedYear) {
      params.set("year", selectedYear);
    } else {
      params.delete("year");
    }
    if (selectedMonths.length > 0) {
      params.set("months", selectedMonths.join(","));
    } else {
      params.delete("months");
    }
    router.push(`/documents?${params.toString()}`);
  }, [selectedYear, selectedMonths, searchParams, router]);

  const downloadPdf = useCallback(() => {
    if (!selectedYear) return;
    setDownloading(true);
    const params = new URLSearchParams();
    params.set("year", selectedYear);
    if (selectedMonths.length > 0) {
      params.set("months", selectedMonths.join(","));
    }
    if (selectedType) {
      params.set("type", selectedType);
    }
    const url = `/api/documents/batch-pdf?${params.toString()}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((j) => { throw new Error(j.error || "Download failed"); });
        }
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        const typeLabel =
          selectedType === "invoice" ? "invoices"
          : selectedType === "quotation" ? "quotations"
          : selectedType === "performa_invoice" ? "performa-invoices"
          : selectedType === "estimate" ? "estimates"
          : selectedType === "receipt" ? "receipts"
          : selectedType === "window_quotation" ? "window-quotations"
          : "documents";
        const period = selectedMonths.length > 0
          ? `${selectedMonths.map((m) => MONTHS.find((x) => x.n === m)?.label).join("")}-${selectedYear}`
          : selectedYear;
        a.download = `${typeLabel}-${period}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => {
        alert(err.message || "Could not download PDF.");
      })
      .finally(() => {
        setDownloading(false);
      });
  }, [selectedYear, selectedMonths, selectedType]);

  const hasFilter = selectedYear || selectedMonths.length > 0;

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 p-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        <span className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Batch Download
        </span>
        {!isOpen && hasFilter && (
          <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Filter active</span>
        )}
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 border-t border-slate-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">All years</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">All types</option>
                <option value="invoice">Invoice</option>
                <option value="quotation">Quotation</option>
                <option value="performa_invoice">Performa Invoice</option>
                <option value="estimate">Estimate</option>
                <option value="receipt">Receipt</option>
                <option value="window_quotation">Window Quotation</option>
              </select>
            </div>

            <button onClick={applyFilter} disabled={!selectedYear} className="btn-primary text-sm px-4 py-2">
              Filter
            </button>

            <button
              onClick={downloadPdf}
              disabled={!selectedYear || downloading}
              className="btn-secondary text-sm px-4 py-2 border-brand-600 text-brand-700"
            >
              {downloading ? "Downloading\u2026" : "Download PDF"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Months</span>
              <button onClick={selectAll} className="text-xs text-brand-600 hover:underline">All</button>
              <button onClick={clearAll} className="text-xs text-slate-400 hover:underline">Clear</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {MONTHS.map((m) => (
                <label
                  key={m.n}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition ${
                    selectedMonths.includes(m.n)
                      ? "bg-brand-600 text-white border-brand-600"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedMonths.includes(m.n)}
                    onChange={() => toggleMonth(m.n)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
