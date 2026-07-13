"use client";

import { DEFAULT_HSN_CODE } from "@/lib/company";

export type LineItem = {
  description: string;
  size: string;
  hsn_code: string;
  qty: number;
  unit: string;
  rate: number;
};

export const EMPTY_ITEM: LineItem = {
  description: "",
  size: "",
  hsn_code: DEFAULT_HSN_CODE,
  qty: 0,
  unit: "sq.ft",
  rate: 0,
};

const UNITS = ["sq.ft", "nos"];

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

export default function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  function update(idx: number, patch: Partial<LineItem>) {
    const next = items.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  function addRow() {
    onChange([...items, { ...EMPTY_ITEM }]);
  }

  function removeRow(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {/* ── Mobile view: compact card per item ── */}
      <div className="md:hidden space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-xl bg-slate-50/80 p-3 border border-slate-100 space-y-2">
            {/* Row 1: Description + trash */}
            <div className="flex gap-2 items-start">
              <div className="flex-1 min-w-0">
                <label className="label">Description <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. 5mm clear glass"
                  value={item.description}
                  required
                  onChange={(e) => update(idx, { description: e.target.value })}
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

            {/* Row 2: Size + HSN */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Size</label>
                <input
                  className="input"
                  placeholder="e.g. 27x48 - 4mm"
                  value={item.size}
                  onChange={(e) => update(idx, { size: e.target.value })}
                />
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

            {/* Row 3: Qty + Unit + Rate */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label">Qty <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={item.qty || ""}
                  required
                  onChange={(e) => update(idx, { qty: Number(e.target.value) })}
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
            </div>

            {/* Row 4: Total */}
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</span>
              <span className="text-sm font-bold text-ink font-mono">
                Rs. {(item.qty * item.rate || 0).toFixed(2)}
              </span>
            </div>
          </div>
        ))}

        <button type="button" onClick={addRow} className="btn-secondary text-base w-full inline-flex items-center justify-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Add line item
        </button>
      </div>

      {/* ── Desktop view: table-style grid ── */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[640px] space-y-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 px-1">
            <div className="col-span-3">Description <span className="text-red-500">*</span></div>
            <div className="col-span-3">Size</div>
            <div className="col-span-1">HSN</div>
            <div className="col-span-1">Qty <span className="text-red-500">*</span></div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-1">Rate <span className="text-red-500">*</span></div>
            <div className="col-span-1">Total</div>
            <div className="col-span-1"></div>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start rounded-xl bg-slate-50/80 p-4 border border-slate-100">
              <div className="col-span-3">
                <input
                  className="input"
                  placeholder="e.g. 5mm clear glass"
                  value={item.description}
                  required
                  onChange={(e) => update(idx, { description: e.target.value })}
                />
              </div>
              <div className="col-span-3">
                <input
                  className="input"
                  placeholder="e.g. 27x48"
                  value={item.size}
                  onChange={(e) => update(idx, { size: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <input
                  className="input text-center"
                  placeholder="7005"
                  value={item.hsn_code}
                  onChange={(e) => update(idx, { hsn_code: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={item.qty || ""}
                  required
                  onChange={(e) => update(idx, { qty: Number(e.target.value) })}
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
              <div className="col-span-1 text-sm font-semibold text-slate-700 px-1 flex items-center min-h-[48px]">
                Rs. {(item.qty * item.rate || 0).toFixed(2)}
              </div>
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
          ))}

          <button type="button" onClick={addRow} className="btn-secondary text-base inline-flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Add line item
          </button>
        </div>
      </div>
    </div>
  );
}
