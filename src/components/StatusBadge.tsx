"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-brass-50 text-brass-700",
  paid: "bg-emerald-50 text-signal-green",
  cancelled: "bg-red-50 text-signal-rust",
};

const STATUS_OPTIONS = ["draft", "sent", "paid", "cancelled"];

export default function StatusBadge({
  documentId,
  currentStatus,
}: {
  documentId: string;
  currentStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [updating, setUpdating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function changeStatus(newStatus: string) {
    if (newStatus === status) {
      setOpen(false);
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        router.refresh();
      }
    } finally {
      setUpdating(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={updating}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition cursor-pointer hover:ring-2 hover:ring-offset-1 ${
          STATUS_STYLES[status] ?? STATUS_STYLES.draft
        } ${updating ? "opacity-60" : ""}`}
        title="Change status"
      >
        {status}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 min-w-[140px] bg-white border border-slate-200 rounded-lg shadow-xl ring-1 ring-black/5 overflow-hidden">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => changeStatus(opt)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition ${
                opt === status ? "font-semibold bg-slate-50" : ""
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  opt === "draft"
                    ? "bg-slate-400"
                    : opt === "sent"
                      ? "bg-brass-500"
                      : opt === "paid"
                        ? "bg-emerald-500"
                        : "bg-red-400"
                }`}
              />
              <span className="capitalize">{opt}</span>
              {opt === status && (
                <svg className="w-3.5 h-3.5 ml-auto text-brand-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
