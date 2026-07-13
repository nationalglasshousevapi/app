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
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setResults(json.customers ?? []);
      setOpen(true);
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
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-brand-200 rounded-lg shadow-xl ring-1 ring-black/5 max-h-64 overflow-y-auto">
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
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-400">{c.contact_number || c.address || ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
