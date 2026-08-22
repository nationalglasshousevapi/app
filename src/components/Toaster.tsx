"use client";

import { useSyncExternalStore } from "react";
import { dismiss, subscribeToasts, getToasts, ToastKind } from "@/lib/toast";

const KIND_STYLES: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-brand-200 bg-brand-50 text-brand-900",
};

const KIND_ICONS: Record<ToastKind, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

export default function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed z-[100] top-4 right-4 left-4 sm:left-auto flex flex-col gap-2 pointer-events-none"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg max-w-sm sm:ml-auto anim-drop-in ${KIND_STYLES[t.kind]}`}
        >
          <span className="shrink-0 mt-0.5" aria-hidden>{KIND_ICONS[t.kind]}</span>
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="shrink-0 opacity-50 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
