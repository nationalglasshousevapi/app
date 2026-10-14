"use client";

import { FormEvent, ReactNode, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MAX_WIDTH = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const;

export default function Modal({
  open,
  onClose,
  onSubmit,
  title,
  description,
  headerAction,
  footer,
  maxWidth = "md",
  role = "dialog",
  closeOnBackdrop = true,
  closeOnEscape = true,
  busy = false,
  bodyClassName = "space-y-4",
  showClose = true,
  children,
}: {
  open?: boolean;
  onClose?: () => void;
  onSubmit?: (e: FormEvent) => void;
  title?: ReactNode;
  description?: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
  maxWidth?: keyof typeof MAX_WIDTH;
  role?: "dialog" | "alertdialog";
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  busy?: boolean;
  bodyClassName?: string;
  showClose?: boolean;
  children: ReactNode;
}) {
  const show = open ?? true;
  const panelRef = useRef<HTMLElement | null>(null);
  const showDefaultClose = showClose && onClose != null && headerAction == null;
  const hasHeader = title != null || headerAction != null || showDefaultClose;

  useEffect(() => {
    if (!show || !onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && closeOnEscape && !busy) {
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, onClose, closeOnEscape, busy]);

  // Lock background scroll while the dialog is open.
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  // Move focus into the dialog unless something inside already claimed it.
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => {
      const el = panelRef.current;
      if (el && !el.contains(document.activeElement))
        el.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [show]);

  function handleBackdrop() {
    if (!busy && closeOnBackdrop) onClose?.();
  }

  const content = (
    <>
      {hasHeader && (
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6 pb-3">
          <div className="min-w-0">
            {title != null && (
              <h2 className="font-display text-xl font-bold text-ink">
                {title}
              </h2>
            )}
            {description != null && (
              <p className="mt-1 text-sm text-slate-500 font-body">
                {description}
              </p>
            )}
          </div>
          {headerAction ??
            (showDefaultClose ? (
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 min-h-[40px] min-w-[40px] disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  width="18"
                  height="18"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            ) : null)}
        </div>
      )}

      <div
        className={`min-h-0 flex-1 overflow-y-auto px-6 ${
          hasHeader ? "pt-1 pb-5" : "py-6"
        } ${footer != null ? "" : "pb-6"} ${bodyClassName}`}
      >
        {children}
      </div>

      {footer != null && (
        <div className="shrink-0 border-t border-slate-100 px-6 py-4">
          {footer}
        </div>
      )}
    </>
  );

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdrop}
          />

          {onSubmit ? (
            <motion.form
              ref={panelRef as React.Ref<HTMLFormElement>}
              onSubmit={onSubmit}
              tabIndex={-1}
              role={role}
              aria-modal="true"
              aria-label={typeof title === "string" ? title : undefined}
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`modal-panel relative mx-auto flex w-full ${MAX_WIDTH[maxWidth]} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl focus:outline-none`}
            >
              {content}
            </motion.form>
          ) : (
            <motion.div
              ref={panelRef as React.Ref<HTMLDivElement>}
              tabIndex={-1}
              role={role}
              aria-modal="true"
              aria-label={typeof title === "string" ? title : undefined}
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`modal-panel relative mx-auto flex w-full ${MAX_WIDTH[maxWidth]} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl focus:outline-none`}
            >
              {content}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
