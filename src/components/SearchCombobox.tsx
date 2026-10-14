"use client";

import { ReactNode, useEffect, useId, useRef, useState } from "react";

export type ComboboxAction = {
  key: string;
  node: ReactNode;
  onSelect: () => void;
};

import { moveActive } from "@/lib/comboboxNav";
export { moveActive };

export default function SearchCombobox({
  query,
  onQueryChange,
  placeholder,
  open,
  onOpenChange,
  searching,
  searchingLabel = "Searching…",
  header,
  actions,
  emptyHint,
  fixed = false,
  id,
  required,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  placeholder: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  searching: boolean;
  searchingLabel?: string;
  header?: ReactNode;
  actions: ComboboxAction[];
  emptyHint?: ReactNode;
  fixed?: boolean;
  id?: string;
  required?: boolean;
}) {
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    setActive(-1);
  }, [actions.length, query]);

  // Outside-close.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        // Fixed-position list lives outside boxRef — ignore clicks inside it.
        const t = e.target as HTMLElement;
        if (t.closest?.(`[data-combobox-list="${listId}"]`)) return;
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onOpenChange, listId]);

  // Measure for fixed positioning (table-overflow escape hatch).
  useEffect(() => {
    if (!fixed || !open || !inputRef.current) return;
    function measure() {
      const r = inputRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [fixed, open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        onOpenChange(true);
        return;
      }
      setActive((a) =>
        moveActive(a, e.key === "ArrowDown" ? 1 : -1, actions.length)
      );
    } else if (e.key === "Enter") {
      if (open && active >= 0 && actions[active]) {
        e.preventDefault();
        actions[active].onSelect();
      }
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  }

  const showList =
    open && (searching || actions.length > 0 || emptyHint != null);

  return (
    <div className="relative" ref={fixed ? undefined : boxRef}>
      <div ref={fixed ? boxRef : undefined}>
        <input
          ref={inputRef}
          id={id}
          className="input"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={
            active >= 0 ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          required={required}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            onOpenChange(true);
          }}
          onFocus={() => onOpenChange(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      {showList &&
        (fixed ? (
          pos && (
            <div
              data-combobox-list={listId}
              id={listId}
              role="listbox"
              className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl ring-1 ring-black/5 max-h-48 overflow-y-auto anim-drop-in"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              {searching ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {searchingLabel}
                </div>
              ) : (
                <>
                  {header}
                  {actions.map((a, i) => (
                    <div
                      key={a.key}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                    >
                      <button
                        type="button"
                        tabIndex={-1}
                        onMouseEnter={() => setActive(i)}
                        onClick={a.onSelect}
                        className={`w-full text-left ${i === active ? "bg-brand-50" : ""}`}
                      >
                        {a.node}
                      </button>
                    </div>
                  ))}
                  {actions.length === 0 && emptyHint}
                </>
              )}
            </div>
          )
        ) : (
          <div
            data-combobox-list={listId}
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl ring-1 ring-black/5 max-h-64 overflow-y-auto anim-drop-in"
          >
            {searching ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {searchingLabel}
              </div>
            ) : (
              <>
                {header}
                {actions.map((a, i) => (
                  <div
                    key={a.key}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseEnter={() => setActive(i)}
                      onClick={a.onSelect}
                      className={`w-full text-left ${i === active ? "bg-brand-50" : ""}`}
                    >
                      {a.node}
                    </button>
                  </div>
                ))}
                {actions.length === 0 && emptyHint}
              </>
            )}
          </div>
        ))}
    </div>
  );
}
