"use client";

import { useEffect, useRef, useState } from "react";
import SearchCombobox, { ComboboxAction } from "@/components/SearchCombobox";

export type SupplierResult = {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  contact_number: string | null;
  email: string | null;
  gst: string | null;
};

export default function SupplierPicker({
  onSelect,
  initialName,
}: {
  onSelect: (s: SupplierResult) => void;
  initialName?: string;
}) {
  const [query, setQuery] = useState(initialName ?? "");
  const [results, setResults] = useState<SupplierResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState<"recent" | "search">("recent");
  const fetchedRecent = useRef(false);

  useEffect(() => {
    if (fetchedRecent.current || initialName) return;
    fetchedRecent.current = true;
    setSearching(true);
    fetch("/api/suppliers?recent=true")
      .then((r) => r.json())
      .then((json) => {
        setResults(json.suppliers ?? []);
        setMode("recent");
        setOpen(true);
      })
      .finally(() => setSearching(false));
  }, [initialName]);

  useEffect(() => {
    if (!query || query.length < 2) {
      if (!query && !fetchedRecent.current) setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/suppliers?q=${encodeURIComponent(query)}`
        );
        const json = await res.json();
        setResults(json.suppliers ?? []);
        setMode("search");
        setOpen(true);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const showRecent =
    mode === "recent" && results.length > 0 && (!query || query.length < 2);
  const showSearch = mode === "search" && results.length > 0;

  function pick(s: SupplierResult) {
    onSelect(s);
    setQuery(s.name);
    setOpen(false);
  }

  const header =
    showRecent || showSearch ? (
      <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
        {showRecent ? "Recent suppliers" : "Search results"}
      </div>
    ) : undefined;

  const actions: ComboboxAction[] = results.map((s) => ({
    key: s.id,
    onSelect: () => pick(s),
    node: (
      <span className="block px-4 py-3 text-sm border-b last:border-0 border-gray-100">
        <span className="font-medium">{s.name}</span>
        <span className="block text-xs text-gray-400">
          {[s.gst, s.contact_number, s.address].filter(Boolean).join(" · ") ||
            ""}
        </span>
      </span>
    ),
  }));

  const emptyHint =
    !showRecent && !showSearch ? (
      <div className="px-4 py-3 text-xs text-slate-400">
        No saved supplier found — details will be stored on the entry only.
      </div>
    ) : undefined;

  return (
    <SearchCombobox
      query={query}
      onQueryChange={setQuery}
      placeholder="Search supplier by name…"
      open={open}
      onOpenChange={setOpen}
      searching={searching}
      header={header}
      actions={searching ? [] : actions}
      emptyHint={emptyHint}
    />
  );
}
