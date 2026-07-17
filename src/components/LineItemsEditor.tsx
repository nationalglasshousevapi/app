"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_HSN_CODE } from "@/lib/company";
import { inr } from "@/lib/format";

export type LineItem = {
  description: string;
  size: string;
  hsn_code: string;
  qty: number;
  unit: string;
  rate: number;
  actual_length: number;
  actual_width: number;
  nos: number;
  calculated_length: number;
  calculated_width: number;
  item_type: "glass" | "charge";
};

const CHARGE_LABELS = new Set(["Transport", "Labour", "Hardware", "Packing & Forwarding"]);

function isChargeLabel(desc: string) {
  return CHARGE_LABELS.has(desc.trim());
}

export const EMPTY_ITEM: LineItem = {
  description: "",
  size: "",
  hsn_code: DEFAULT_HSN_CODE,
  qty: 0,
  unit: "sq.ft",
  rate: 0,
  actual_length: 0,
  actual_width: 0,
  nos: 1,
  calculated_length: 0,
  calculated_width: 0,
  item_type: "glass",
};

const UNITS = ["sq.ft", "nos"];

function roundUpInches(inches: number): number {
  if (inches <= 0) return 0;
  if (inches < 24) return Math.ceil(inches / 3) * 3;
  return Math.ceil(inches / 6) * 6;
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/* ── Description Combobox ── */
function DescriptionCombobox({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ id: string; description: string }[]>([]);
  const [filtered, setFiltered] = useState<{ id: string; description: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch on mount
  useEffect(() => {
    fetch("/api/descriptions")
      .then((r) => r.json())
      .then((json) => setItems(json.descriptions ?? []))
      .catch(() => {});
  }, []);

  // Filter as user types
  useEffect(() => {
    if (!value.trim()) {
      setFiltered(items);
      return;
    }
    const q = value.toLowerCase();
    setFiltered(items.filter((d) => d.description.toLowerCase().includes(q)));
  }, [value, items]);

  // Close on outside click, recalc position on scroll/resize
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function reposition() {
      if (open && inputRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  function openWithPos() {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  }

  const valueExists = items.some((d) => d.description === value.trim());
  const showAdd = value.trim() && !valueExists && !adding;

  async function addAndSelect() {
    setAdding(true);
    try {
      const res = await fetch("/api/descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: value.trim() }),
      });
      const json = await res.json();
      if (json.description) {
        setItems((prev) => [...prev, json.description].sort((a, b) => a.description.localeCompare(b.description)));
      }
    } catch {}
    setAdding(false);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <input
        ref={inputRef}
        className="input"
        placeholder="e.g. 5mm clear glass"
        value={value}
        required
        id={id}
        onChange={(e) => {
          onChange(e.target.value);
          openWithPos();
        }}
        onFocus={() => openWithPos()}
      />
      {open && (filtered.length > 0 || showAdd) && pos && (
        <div
          className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl ring-1 ring-black/5 max-h-48 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {filtered.map((d) => (
            <button
              type="button"
              key={d.id}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 border-b border-gray-100 last:border-0 ${
                value === d.description ? "bg-brand-50 font-medium" : ""
              }`}
              onClick={() => {
                onChange(d.description);
                setOpen(false);
              }}
            >
              {d.description}
            </button>
          ))}
          {showAdd && (
            <button
              type="button"
              onClick={addAndSelect}
              className="w-full text-left px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 border-t border-dashed border-gray-200 font-medium"
            >
              + Add &ldquo;{value.trim()}&rdquo; to saved descriptions
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  function update(idx: number, patch: Partial<LineItem>) {
    const next = items.slice();
    const prev = next[idx];
    const updated = { ...prev, ...patch };

    // Auto-detect charge items from description
    if (patch.description !== undefined && isChargeLabel(updated.description)) {
      updated.item_type = "charge";
    } else if (patch.description !== undefined && updated.item_type === "charge" && !isChargeLabel(updated.description)) {
      updated.item_type = "glass";
    }

    if (updated.item_type === "charge") {
      // Charge items: qty=1, no dimensions needed
      updated.qty = 1;
      updated.size = "";
      updated.actual_length = 0;
      updated.actual_width = 0;
      updated.nos = 1;
      updated.calculated_length = 0;
      updated.calculated_width = 0;
      updated.unit = "nos";
    } else {
      // Glass items: recalculate derived fields from actual dimensions
      const actualLength = updated.actual_length || 0;
      const actualWidth = updated.actual_width || 0;
      const nos = updated.nos || 1;

      updated.calculated_length = roundUpInches(actualLength);
      updated.calculated_width = roundUpInches(actualWidth);

      if (updated.calculated_length > 0 && updated.calculated_width > 0) {
        updated.size = `${updated.calculated_length}x${updated.calculated_width}`;
      } else {
        updated.size = "";
      }

      if (updated.unit === "sq.ft") {
        updated.qty = Math.round((updated.calculated_length * updated.calculated_width * nos) / 144 * 100) / 100;
      } else {
        updated.qty = nos;
      }
    }

    next[idx] = updated;
    onChange(next);
  }

  function addRow() {
    onChange([...items, { ...EMPTY_ITEM }]);
  }

  function removeRow(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  // ── Mobile card view ──
  function MobileCard({ item, idx }: { item: LineItem; idx: number }) {
    const amount = (item.qty || 0) * (item.rate || 0);
    const isCharge = item.item_type === "charge";
    return (
      <div className={`rounded-xl p-3 border space-y-2 ${isCharge ? "bg-amber-50/50 border-amber-100" : "bg-slate-50/80 border-slate-100"}`}>
        <div className="flex gap-2 items-start">
          <div className="flex-1 min-w-0">
            <label className="label">Description <span className="text-red-500">*</span></label>
            <DescriptionCombobox
              value={item.description}
              onChange={(v) => update(idx, { description: v })}
            />
          </div>
          <button
            type="button"
            onClick={() => removeRow(idx)}
            className="mt-6 p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
            aria-label="Remove line item"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
        {isCharge ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Amount</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={item.rate || ""}
                required
                onChange={(e) => update(idx, { rate: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Type</label>
              <div className="input bg-slate-100 text-slate-500 flex items-center h-[42px] text-xs font-medium">
                Charge item
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Actual L (inches)</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 21.5"
                  value={item.actual_length || ""}
                  onChange={(e) => update(idx, { actual_length: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Actual W (inches)</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 32"
                  value={item.actual_width || ""}
                  onChange={(e) => update(idx, { actual_width: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label">Nos</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={item.nos || 1}
                  onChange={(e) => update(idx, { nos: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
              <div>
                <label className="label">Calc LxW</label>
                <div className="input bg-slate-100 text-slate-500 flex items-center h-[42px] text-sm">
                  {item.calculated_length > 0 && item.calculated_width > 0
                    ? `${item.calculated_length}×${item.calculated_width}`
                    : "—"}
                </div>
              </div>
              <div>
                <label className="label">Qty</label>
                <div className="input bg-slate-100 text-slate-500 flex items-center h-[42px] text-sm">
                  {item.qty || "—"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label">Rate <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.rate || ""}
                  required
                  onChange={(e) => update(idx, { rate: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Unit</label>
                <select
                  className="input"
                  value={item.unit}
                  onChange={(e) => update(idx, { unit: e.target.value })}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">HSN</label>
                <input
                  className="input"
                  placeholder="7005"
                  value={item.hsn_code}
                  onChange={(e) => update(idx, { hsn_code: e.target.value })}
                />
              </div>
            </div>
          </>
        )}
        <div className="flex justify-between items-center pt-0.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</span>
          <span className="text-sm font-bold text-ink font-mono">
            {inr(amount, 2)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Mobile view ── */}
      <div className="md:hidden space-y-3">
        {items.map((item, idx) => (
          <MobileCard key={idx} item={item} idx={idx} />
        ))}
        <button type="button" onClick={addRow} className="btn-secondary text-base w-full inline-flex items-center justify-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Add line item
        </button>
      </div>

      {/* ── Desktop view ── */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[640px] space-y-3">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 px-1">
            <div className="col-span-2">Description <span className="text-red-500">*</span></div>
            <div className="col-span-1">Act. L</div>
            <div className="col-span-1">Act. W</div>
            <div className="col-span-1">Nos</div>
            <div className="col-span-1">Calc. L</div>
            <div className="col-span-1">Calc. W</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-1">Rate <span className="text-red-500">*</span></div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-1">Amount</div>
            <div className="col-span-1"></div>
          </div>

          {items.map((item, idx) => {
            const isCharge = item.item_type === "charge";
            return (
            <div key={idx} className={`grid grid-cols-12 gap-2 items-start rounded-xl p-4 border ${isCharge ? "bg-amber-50/50 border-amber-100" : "bg-slate-50/80 border-slate-100"}`}>
              <div className="col-span-2">
                <DescriptionCombobox
                  value={item.description}
                  onChange={(v) => update(idx, { description: v })}
                />
              </div>
              {isCharge ? (
                <>
                  <div className="col-span-5">
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      value={item.rate || ""}
                      required
                      onChange={(e) => update(idx, { rate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-1 flex items-center min-h-[48px]">
                    <span className="text-xs font-medium text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">
                      Charge
                    </span>
                  </div>
                  <div className="col-span-3" />
                  <div className="col-span-1 text-sm font-semibold text-slate-700 px-1 flex items-center min-h-[48px]">
                    {inr(item.rate || 0, 2)}
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-1">
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="L"
                      value={item.actual_length || ""}
                      onChange={(e) => update(idx, { actual_length: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="W"
                      value={item.actual_width || ""}
                      onChange={(e) => update(idx, { actual_width: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      className="input"
                      type="number"
                      min="1"
                      step="1"
                      value={item.nos || 1}
                      onChange={(e) => update(idx, { nos: Math.max(1, parseInt(e.target.value) || 1) })}
                    />
                  </div>
                  <div className="col-span-1 flex items-center min-h-[48px]">
                    <span className="text-sm text-slate-600">
                      {item.calculated_length > 0 ? `${item.calculated_length}"` : "—"}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center min-h-[48px]">
                    <span className="text-sm text-slate-600">
                      {item.calculated_width > 0 ? `${item.calculated_width}"` : "—"}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center min-h-[48px]">
                    <span className="text-sm font-medium text-slate-700">
                      {item.qty > 0 ? item.qty : "—"}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.rate || ""}
                      required
                      onChange={(e) => update(idx, { rate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-1">
                    <select
                      className="input"
                      value={item.unit}
                      onChange={(e) => update(idx, { unit: e.target.value })}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1 text-sm font-semibold text-slate-700 px-1 flex items-center min-h-[48px]">
                    {inr((item.qty || 0) * (item.rate || 0), 2)}
                  </div>
                </>
              )}
              <div className="col-span-1 flex items-center min-h-[48px] justify-center">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg p-2 transition"
                  title="Remove line"
                  aria-label="Remove line item"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            );
          })}

          <button type="button" onClick={addRow} className="btn-secondary text-base inline-flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Add line item
          </button>
        </div>
      </div>
    </div>
  );
}
