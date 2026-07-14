"use client";

import { DEFAULT_HSN_CODE } from "@/lib/company";
import type { DocType } from "@/lib/docTypes";

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
};

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

export default function LineItemsEditor({
  items,
  onChange,
  docType,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  docType?: DocType;
}) {
  const isInvoice = docType === "invoice";

  function update(idx: number, patch: Partial<LineItem>) {
    const next = items.slice();
    const updated = { ...next[idx], ...patch };

    if (isInvoice) {
      // Recalculate derived fields from actual dimensions
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

  // ── Invoice mobile view ──
  function InvoiceMobileCard({ item, idx }: { item: LineItem; idx: number }) {
    const amount = (item.qty || 0) * (item.rate || 0);
    return (
      <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-100 space-y-2">
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
        <div className="flex justify-between items-center pt-0.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</span>
          <span className="text-sm font-bold text-ink font-mono">
            Rs. {amount.toFixed(2)}
          </span>
        </div>
      </div>
    );
  }

  // ── Non-invoice mobile view ──
  function DefaultMobileCard({ item, idx }: { item: LineItem; idx: number }) {
    return (
      <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-100 space-y-2">
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
        <div className="flex justify-between items-center pt-0.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</span>
          <span className="text-sm font-bold text-ink font-mono">
            Rs. {(item.qty * item.rate || 0).toFixed(2)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Mobile view ── */}
      <div className="md:hidden space-y-3">
        {items.map((item, idx) =>
          isInvoice ? (
            <InvoiceMobileCard key={idx} item={item} idx={idx} />
          ) : (
            <DefaultMobileCard key={idx} item={item} idx={idx} />
          )
        )}
        <button type="button" onClick={addRow} className="btn-secondary text-base w-full inline-flex items-center justify-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Add line item
        </button>
      </div>

      {/* ── Desktop view ── */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[640px] space-y-3">
          {isInvoice ? (
            <>
              {/* Invoice column headers */}
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

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                  <div className="col-span-2">
                    <input
                      className="input"
                      placeholder="e.g. 5mm clear glass"
                      value={item.description}
                      required
                      onChange={(e) => update(idx, { description: e.target.value })}
                    />
                  </div>
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
                    Rs. {((item.qty || 0) * (item.rate || 0)).toFixed(2)}
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
            </>
          ) : (
            <>
              {/* Default column headers */}
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
            </>
          )}

          <button type="button" onClick={addRow} className="btn-secondary text-base inline-flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Add line item
          </button>
        </div>
      </div>
    </div>
  );
}
