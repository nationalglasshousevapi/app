"use client";

import { useEffect, useRef, useState } from "react";

type Customer = {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  contact_number: string | null;
  email: string | null;
  gst: string | null;
};

export default function CustomerPicker({
  onSelect,
  initialName,
}: {
  onSelect: (c: Customer) => void;
  initialName?: string;
}) {
  const [query, setQuery] = useState(initialName ?? "");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.customers ?? []);
        setOpen(true);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="input"
        placeholder="Search customer by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && (searching || results.length > 0) && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl ring-1 ring-black/5 max-h-64 overflow-y-auto">
          {searching ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching…
            </div>
          ) : (
            results.map((c) => (
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
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-400">{c.contact_number || c.address || ""}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
