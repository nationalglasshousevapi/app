"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerPicker, { type CustomerResult } from "./CustomerPicker";
import { DEFAULT_HSN_CODE } from "@/lib/company";
import { computeTax, computeTotal } from "@/lib/documents";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import { inr } from "@/lib/format";
import { useDraftPersistence } from "@/lib/useDraftPersistence";

type SaleItem = {
  description: string;
  size: string;
  hsn_code: string;
  qty: number;
  unit: string;
  rate: number;
};

const UNITS = ["sq.ft", "rn ft", "nos", "pcs"];
const SALE_MODES = PAYMENT_MODES.filter((m) => m.value !== "adjustment");

function today() {
  return new Date().toISOString().slice(0, 10);
}

type CashSaleDraft = {
  customer: CustomerResult | null;
  walkInName: string;
  items: SaleItem[];
  taxType: "cgst_sgst" | "none";
  discountAmount: number;
  paymentMode: string;
  referenceNumber: string;
  remarks: string;
  amountPaid: number;
};

const DRAFT_KEY = "ngh_draft_cash_sale";

function isBlankSale(d: CashSaleDraft): boolean {
  return (
    !d.customer &&
    !d.walkInName.trim() &&
    d.items.every((it) => !it.description.trim() && !(it.qty > 0)) &&
    d.taxType === "cgst_sgst" &&
    !d.discountAmount &&
    d.paymentMode === "cash" &&
    !d.referenceNumber.trim() &&
    !d.remarks.trim() &&
    !d.amountPaid
  );
}

export default function CashSaleForm() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerResult | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [docDate, setDocDate] = useState(today());
  const [items, setItems] = useState<SaleItem[]>([
    { description: "", size: "", hsn_code: DEFAULT_HSN_CODE, qty: 0, unit: "sq.ft", rate: 0 },
  ]);
  const [taxType, setTaxType] = useState<"cgst_sgst" | "none">("cgst_sgst");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [amountPaid, setAmountPaid] = useState(0);
  const hasEditedPaidRef = useRef(false);
  const [savedDescriptions, setSavedDescriptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { existing: draft, save: saveDraft, clear: clearDraft } = useDraftPersistence<CashSaleDraft>(DRAFT_KEY);

  useEffect(() => {
    fetch("/api/descriptions")
      .then((res) => res.json())
      .then((json) => setSavedDescriptions((json.descriptions ?? []).map((d: { description: string }) => d.description)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const snapshot = {
      customer,
      walkInName,
      items,
      taxType,
      discountAmount,
      paymentMode,
      referenceNumber,
      remarks,
      amountPaid,
    };
    if (!isBlankSale(snapshot)) saveDraft(snapshot);
  }, [customer, walkInName, items, taxType, discountAmount, paymentMode, referenceNumber, remarks, amountPaid, saveDraft]);

  function restoreDraft(d: CashSaleDraft) {
    setCustomer(d.customer);
    setWalkInName(d.walkInName);
    setItems(d.items?.length ? d.items : [{ description: "", size: "", hsn_code: DEFAULT_HSN_CODE, qty: 0, unit: "sq.ft", rate: 0 }]);
    setTaxType(d.taxType ?? "cgst_sgst");
    setDiscountAmount(d.discountAmount || 0);
    setPaymentMode(d.paymentMode || "cash");
    setReferenceNumber(d.referenceNumber || "");
    setRemarks(d.remarks || "");
    setAmountPaid(d.amountPaid || 0);
    hasEditedPaidRef.current = true;
    clearDraft();
    setBannerDismissed(true);
  }

  const resumableDraft = draft && !isBlankSale(draft.data) ? draft : null;

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0),
    [items],
  );
  const { cgst, sgst } = useMemo(
    () => computeTax(subtotal, taxType, 0.18, discountAmount),
    [subtotal, taxType, discountAmount],
  );
  const { totalAmount } = useMemo(
    () => computeTotal(subtotal, cgst, sgst, 0, discountAmount),
    [subtotal, cgst, sgst, discountAmount],
  );

  const balanceDue = useMemo(() => Math.max(0, totalAmount - (amountPaid || 0)), [totalAmount, amountPaid]);
  const isOverPaid = (amountPaid || 0) > totalAmount;

  // Auto-default paid to total when total is first computed or when user hasn't manually edited.
  // This gives quick full-paid behavior but still allows 0 / partial.
  useEffect(() => {
    if (!hasEditedPaidRef.current && totalAmount > 0) {
      setAmountPaid(totalAmount);
    }
  }, [totalAmount]);

  function patchItem(i: number, p: Partial<SaleItem>) {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...p } : it)));
  }

  async function save() {
    if (saving) return;
    const validItems = items.filter((it) => it.description.trim() && (it.qty || 0) > 0);
    if (!validItems.length) {
      setError("Add at least one item with a description and quantity.");
      return;
    }
    if (!customer && !walkInName.trim()) {
      setError("Customer name is required. Pick a customer or enter a name (e.g. Ramesh).");
      return;
    }
    const paid = amountPaid || 0;
    if (paid < 0) {
      setError("Paid amount cannot be negative.");
      return;
    }
    if (paid > totalAmount) {
      setError(`Paid (${inr(paid, 2)}) cannot exceed total (${inr(totalAmount, 2)}).`);
      return;
    }
    if (paid > 0 && (paymentMode === "bank_transfer" || paymentMode === "cheque") && !referenceNumber.trim()) {
      setError("Reference number is required for bank transfer / cheque.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/cash-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customer?.id ?? null,
          customer_name: customer ? customer.name : walkInName.trim(),
          customer_phone: customer?.contact_number ?? "",
          doc_date: docDate,
          tax_type: taxType,
          discount_amount: discountAmount,
          remarks: remarks || null,
          payment_mode: paymentMode,
          reference_number: referenceNumber,
          amount_paid: paid,
          items: validItems,
        }),
      });
      const json = await res.json();
      if (res.ok && json.document) {
        clearDraft();
        router.push(`/documents/${json.document.id}`);
        router.refresh();
      } else {
        setError(json.error || "Could not save the sale.");
      }
    } catch {
      setError("Could not save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  const paymentLabel = SALE_MODES.find((m) => m.value === paymentMode)?.label ?? paymentMode;
  let ctaLabel: string;
  if (amountPaid === 0) {
    ctaLabel = `Create order • ${inr(totalAmount, 2)} due on collection`;
  } else if ((amountPaid || 0) < totalAmount) {
    ctaLabel = `Create order • Paid ${inr(amountPaid || 0, 2)} • Balance ${inr(balanceDue, 2)}`;
  } else {
    ctaLabel = `Complete sale & record ${paymentMode === "cash" ? "cash" : paymentLabel.toLowerCase()} payment`;
  }

  return (
    <div className="space-y-5">
      {resumableDraft && !bannerDismissed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
          <span className="text-amber-900 font-medium">
            Resume unsaved sale from {new Date(resumableDraft.savedAt).toLocaleString()}?
          </span>
          <span className="flex items-center gap-2">
            <button
              onClick={() => restoreDraft(resumableDraft.data)}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Restore
            </button>
            <button
              onClick={() => {
                clearDraft();
                setBannerDismissed(true);
              }}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Discard
            </button>
          </span>
        </div>
      )}
      {/* Customer */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="label !mb-0">Customer *</h2>
          <span className="text-xs text-slate-500">Required for advance/balance tracking</span>
        </div>
        {customer ? (
          <div className="flex items-center justify-between rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
            <div>
              <p className="font-semibold text-ink">{customer.name}</p>
              {customer.contact_number && (
                <p className="text-xs text-slate-500 font-body">{customer.contact_number}</p>
              )}
            </div>
            <button
              onClick={() => setCustomer(null)}
              className="text-sm text-brand-600 hover:underline font-semibold"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <CustomerPicker onSelect={setCustomer} />
            <div>
              <label className="label">New customer name *</label>
              <input
                className="input"
                placeholder="e.g. Ramesh (will be created if not found)"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                No GST needed. A customer record will be created automatically so you can track balance later.
              </p>
            </div>
          </>
        )}
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        </div>
      </div>

      {/* Items */}
      <div className="card p-5">
        <h2 className="label mb-3">Items</h2>
        <datalist id="sale-descriptions">
          {savedDescriptions.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
              <div className="col-span-2 sm:col-span-4">
                {i === 0 && <label className="label">Description</label>}
                <input
                  list="sale-descriptions"
                  className="input !min-h-[34px]"
                  placeholder="e.g. 5 mm Clear Glass"
                  value={it.description}
                  onChange={(e) => patchItem(i, { description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                {i === 0 && <label className="label">Size</label>}
                <input className="input !min-h-[34px]" placeholder='6&apos; x 4&apos;' value={it.size} onChange={(e) => patchItem(i, { size: e.target.value })} />
              </div>
              <div className="sm:col-span-1">
                {i === 0 && <label className="label">Qty</label>}
                <input type="number" min="0" step="any" className="input !min-h-[34px]" placeholder="0" value={it.qty || ""} onChange={(e) => patchItem(i, { qty: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="sm:col-span-1">
                {i === 0 && <label className="label">Unit</label>}
                <select className="input !min-h-[34px]" value={it.unit} onChange={(e) => patchItem(i, { unit: e.target.value })}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                {i === 0 && <label className="label">Rate</label>}
                <input type="number" min="0" step="any" className="input !min-h-[34px]" placeholder="0" value={it.rate || ""} onChange={(e) => patchItem(i, { rate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2">
                <span className="font-mono text-sm whitespace-nowrap">{inr((it.qty || 0) * (it.rate || 0), 2)}</span>
                <button
                  onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                  disabled={items.length === 1}
                  className="text-red-500 hover:text-red-700 text-lg leading-none px-1 disabled:opacity-30"
                  aria-label="Remove item"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            setItems((prev) => [...prev, { description: "", size: "", hsn_code: DEFAULT_HSN_CODE, qty: 0, unit: "sq.ft", rate: 0 }])
          }
          className="mt-3 w-full border border-dashed border-slate-300 text-brand-600 font-mono text-xs py-2 rounded-lg hover:border-brand-500 transition"
        >
          + Add item
        </button>
      </div>

      {/* Payment */}
      <div className="card p-5 space-y-4">
        <h2 className="label">Payment</h2>

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-mono font-semibold">{inr(subtotal, 2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Discount</span>
            <input
              type="number"
              min="0"
              step="any"
              className="input !min-h-[30px] !py-1 w-28 text-right font-mono"
              value={discountAmount || ""}
              placeholder="0"
              onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              GST{" "}
              <select
                className="ml-1 text-xs font-semibold border border-slate-200 rounded-md px-1 py-0.5"
                value={taxType}
                onChange={(e) => setTaxType(e.target.value as "cgst_sgst" | "none")}
              >
                <option value="cgst_sgst">18% CGST+SGST</option>
                <option value="none">No GST</option>
              </select>
            </span>
            <span className="font-mono font-semibold">{inr(cgst + sgst, 2)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="font-bold">Total</span>
            <span className="text-xl font-bold font-mono text-brand-600">{inr(totalAmount, 2)}</span>
          </div>
        </div>

        {/* Paid / Balance */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Paid now *</label>
              <input
                type="number"
                min="0"
                max={totalAmount}
                step="any"
                className={`input font-mono text-right ${isOverPaid ? "!border-red-400 !bg-red-50" : ""}`}
                value={amountPaid === 0 ? "0" : amountPaid || ""}
                placeholder="0"
                onChange={(e) => {
                  hasEditedPaidRef.current = true;
                  const v = parseFloat(e.target.value);
                  setAmountPaid(Number.isNaN(v) ? 0 : v);
                }}
                onFocus={(e) => e.target.select()}
              />
              <div className="flex gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    hasEditedPaidRef.current = true;
                    setAmountPaid(0);
                  }}
                  className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-white hover:border-brand-300"
                >
                  No advance
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hasEditedPaidRef.current = true;
                    setAmountPaid(totalAmount);
                  }}
                  className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-white hover:border-brand-300"
                >
                  Full paid
                </button>
                {totalAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      hasEditedPaidRef.current = true;
                      setAmountPaid(Math.round(totalAmount / 2));
                    }}
                    className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-white hover:border-brand-300"
                  >
                    50%
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <label className="label">Balance due</label>
                <div className={`rounded-lg px-3 py-2.5 text-right font-mono font-bold text-lg border ${balanceDue === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-800"} ${isOverPaid ? "!bg-red-50 !border-red-200 !text-red-700" : ""}`}>
                  {inr(balanceDue, 2)}
                </div>
              </div>
              {isOverPaid && <p className="text-xs text-red-600 mt-1">Paid exceeds total. Reduce paid amount.</p>}
              {!isOverPaid && balanceDue === 0 && totalAmount > 0 && amountPaid > 0 && (
                <p className="text-xs text-emerald-600 mt-1">Fully paid — no balance.</p>
              )}
              {!isOverPaid && balanceDue > 0 && balanceDue < totalAmount && (
                <p className="text-xs text-amber-700 mt-1">Advance collected — {inr(balanceDue, 2)} to collect on delivery.</p>
              )}
              {!isOverPaid && (amountPaid || 0) === 0 && totalAmount > 0 && (
                <p className="text-xs text-slate-600 mt-1">No advance — full amount due on collection.</p>
              )}
            </div>
          </div>

          {((amountPaid || 0) > 0) && (
            <div className="pt-2 border-t border-slate-200 space-y-3">
              <p className="text-xs font-semibold text-slate-600">How was advance paid? (only when Paid &gt; 0)</p>
              <div className="flex flex-wrap gap-2">
                {SALE_MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMode(m.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                      paymentMode === m.value
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {(paymentMode === "bank_transfer" || paymentMode === "cheque" || paymentMode === "upi") && (
                <div>
                  <label className="label">Reference number{paymentMode === "upi" ? " (optional)" : ""}</label>
                  <input className="input" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder={paymentMode === "upi" ? "UPI ref (optional)" : "Cheque / transfer ref"} />
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="label">Remarks</label>
          <input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Advance for order, collect in 2 days" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="sticky bottom-20 md:bottom-4 z-10">
        <button onClick={save} disabled={saving || isOverPaid} className="btn-primary w-full text-base disabled:opacity-60">
          {saving ? "Saving…" : ctaLabel}
        </button>
      </div>
    </div>
  );
}
