"use client";

export type ToastKind = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let listeners: Listener[] = [];
let nextId = 1;

function emit() {
  for (const l of listeners) l(items);
}

function push(kind: ToastKind, message: string, duration = 4000) {
  const item = { id: nextId++, kind, message };
  items = [...items, item];
  emit();
  setTimeout(() => dismiss(item.id), duration);
}

export function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message, 6000),
  info: (message: string) => push("info", message),
};

export function subscribeToasts(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getToasts() {
  return items;
}
