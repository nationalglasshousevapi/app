"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 500;

export type DraftEnvelope<T> = {
  data: T;
  savedAt: number;
};

export function readDraftSync<T>(key: string): DraftEnvelope<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "data" in parsed && "savedAt" in parsed) {
      return parsed as DraftEnvelope<T>;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeDraftSync<T>(key: string, data: T): void {
  try {
    const envelope: DraftEnvelope<T> = { data, savedAt: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* private mode or quota exceeded - fail silently */
  }
}

export function clearDraftSync(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function useDraftPersistence<T>(key: string) {
  const [existing, setExisting] = useState<DraftEnvelope<T> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setExisting(readDraftSync<T>(key));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key]);

  const save = useCallback(
    (data: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        writeDraftSync(key, data);
      }, DEBOUNCE_MS);
    },
    [key],
  );

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    clearDraftSync(key);
    setExisting(null);
  }, []);

  return { existing, save, clear };
}
