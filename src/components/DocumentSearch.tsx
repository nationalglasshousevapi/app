"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function DocumentSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) {
      params.set("q", q.trim());
    } else {
      params.delete("q");
    }
    router.push(`/documents?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
      <input
        className="input flex-1"
        placeholder="Search by document number or customer name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" className="btn-secondary w-full sm:w-auto">Search</button>
    </form>
  );
}
