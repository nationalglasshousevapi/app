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
  children: ReactNode;
}) {
  const show = open ?? true;
  const panelRef = useRef<HTMLElement | null>(null);
  const hasHeader = title != null || headerAction != null;

  useEffect(() => {
    if (!show || !onClose || !closeOnEscape) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, onClose, closeOnEscape]);

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
          {headerAction}
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
