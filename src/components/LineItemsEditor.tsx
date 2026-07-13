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
    <div className="space-y-3 overflow-x-auto -mx-3 md:mx-0">
      <div className="min-w-[640px] px-3 md:px-0 space-y-3">
        <div className="hidden lg:grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 px-1">
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
          <div key={idx} className="grid grid-cols-12 gap-2 items-center rounded-xl bg-slate-50/80 p-3 md:p-4 border border-slate-100">
            <div className="col-span-12 lg:col-span-3">
              <label className="label lg:hidden">Description <span className="text-red-500">*</span></label>
              <input
                className="input"
                placeholder="e.g. 5mm clear glass"
                value={item.description}
                required
                onChange={(e) => update(idx, { description: e.target.value })}
              />
            </div>
            <div className="col-span-6 lg:col-span-3">
              <label className="label lg:hidden">Size</label>
              <input
                className="input"
                placeholder="e.g. 27x48 - 4mm"
                value={item.size}
                onChange={(e) => update(idx, { size: e.target.value })}
              />
            </div>
            <div className="col-span-6 lg:col-span-1">
              <label className="label lg:hidden">HSN</label>
              <input
                className="input text-center"
                placeholder="7005"
                value={item.hsn_code}
                onChange={(e) => update(idx, { hsn_code: e.target.value })}
              />
            </div>
            <div className="col-span-4 lg:col-span-1">
              <label className="label lg:hidden">Qty <span className="text-red-500">*</span></label>
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
            <div className="col-span-4 lg:col-span-1">
              <label className="label lg:hidden">Unit</label>
              <select
                className="input"
                value={item.unit}
                onChange={(e) => update(idx, { unit: e.target.value })}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-4 lg:col-span-1">
              <label className="label lg:hidden">Rate <span className="text-red-500">*</span></label>
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
            <div className="col-span-6 lg:col-span-1 text-sm font-semibold text-slate-700 px-1 flex items-center min-h-[48px]">
              Rs. {(item.qty * item.rate || 0).toFixed(2)}
            </div>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="col-span-6 lg:col-span-1 text-red-500 text-sm font-semibold hover:underline text-right min-h-[48px] flex items-center justify-end"
            >
              Remove
            </button>
          </div>
        ))}

        <button type="button" onClick={addRow} className="btn-secondary text-base mt-3 w-full sm:w-auto">
          + Add line item
        </button>
      </div>
    </div>
  );
}
