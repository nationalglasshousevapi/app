"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type CustomerResult = {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  contact_number: string | null;
  email: string | null;
  gst: string | null;
  balance_due?: number;
};

function inr(v: number) {
  return `₹ ${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CustomerPicker({
  onSelect,
  initialName,
}: {
  onSelect: (c: CustomerResult) => void;
  initialName?: string;
}) {
  const [query, setQuery] = useState(initialName ?? "");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState<"recent" | "search">("recent");
  const fetchedRecent = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Fetch recent customers on mount (once)
  useEffect(() => {
    if (fetchedRecent.current || initialName) return;
    fetchedRecent.current = true;
    setSearching(true);
    fetch("/api/customers?recent=true")
      .then((r) => r.json())
      .then((json) => {
        setResults(json.customers ?? []);
        setMode("recent");
        setOpen(true);
      })
      .finally(() => setSearching(false));
  }, [initialName]);

  // Debounced search when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      // Keep recent results visible when query is cleared
      if (!query && fetchedRecent.current) {
        // Already have recent results, don't clear
      } else {
        setResults([]);
      }
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.customers ?? []);
        setMode("search");
        setOpen(true);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const showRecent = mode === "recent" && results.length > 0 && (!query || query.length < 2);
  const showSearch = mode === "search" && results.length > 0;

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="input"
        placeholder="Search customer by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      <AnimatePresence>
        {open && (searching || showRecent || showSearch) && (
          <motion.div
            className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl ring-1 ring-black/5 max-h-64 overflow-y-auto"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
          >
            {searching ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching…
              </div>
            ) : (
              <>
                {showRecent && (
                  <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                    Recent customers
                  </div>
                )}
                {showSearch && (
                  <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                    Search results
                  </div>
                )}
                {results.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className="w-full text-left px-4 py-3 hover:bg-brand-50 text-sm border-b last:border-0 border-gray-100"
                    onClick={() => {
                      onSelect(c);
                      setQuery(c.name);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.name}</span>
                      {c.balance_due != null && c.balance_due !== 0 && (
                        <span
                          className={`text-xs font-mono ${
                            c.balance_due > 0 ? "text-red-500" : "text-green-600"
                          }`}
                        >
                          {c.balance_due > 0 ? "" : "+"}
                          {inr(Math.abs(c.balance_due))}
                          {c.balance_due > 0 ? " due" : " cr"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {c.contact_number || c.address || ""}
                    </div>
                  </button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
