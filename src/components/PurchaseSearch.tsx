"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PurchaseSearch({ initialQuery }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery ?? "");
  const router = useRouter();
  const searchParams = useSearchParams();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) {
      params.set("q", q.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`/purchases?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        className="input flex-1"
        placeholder="Search by purchase number or supplier name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" className="btn-primary">
        Search
      </button>
    </form>
  );
}
