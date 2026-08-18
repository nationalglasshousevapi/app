"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_HSN_CODE } from "@/lib/company";
import { computeTax, computeTotal } from "@/lib/documents";
import { inr } from "@/lib/format";

export type PurchaseItem = {
  description: string;
  size: string;
  hsn_code: string;
  qty: number;
  unit: string;
  rate: number;
};

export type PurchaseFormValue = {
  id?: string;
  doc_number?: string;
  doc_date: string;
  supplier_name: string;
  supplier_address: string;
  supplier_contact_person: string;
  supplier_contact_number: string;
  supplier_gst: string;
  tax_type: "cgst_sgst" | "igst" | "none";
  tax_rate: number;
  remarks: string;
  status: string;
  items: PurchaseItem[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function blankPurchase(): PurchaseFormValue {
  return {
    doc_date: today(),
    supplier_name: "",
    supplier_address: "",
    supplier_contact_person: "",
    supplier_contact_number: "",
    supplier_gst: "",
    tax_type: "cgst_sgst",
    tax_rate: 0.18,
    remarks: "",
    status: "draft",
    items: [{ description: "", size: "", hsn_code: DEFAULT_HSN_CODE, qty: 0, unit: "sq.ft", rate: 0 }],
  };
}

const UNITS = ["sq.ft", "rn ft", "nos", "pcs"];

export default function PurchaseForm({ initial }: { initial: PurchaseFormValue }) {
  const [value, setValue] = useState<PurchaseFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function patch(p: Partial<PurchaseFormValue>) {
    setValue((v) => ({ ...v, ...p }));
  }

  function patchItem(i: number, p: Partial<PurchaseItem>) {
    setValue((v) => ({
      ...v,
      items: v.items.map((it, j) => (j === i ? { ...it, ...p } : it)),
    }));
  }

  function addItem() {
    setValue((v) => ({
      ...v,
      items: [...v.items, { description: "", size: "", hsn_code: DEFAULT_HSN_CODE, qty: 0, unit: "sq.ft", rate: 0 }],
    }));
  }

  function removeItem(i: number) {
    setValue((v) => ({ ...v, items: v.items.filter((_, j) => j !== i) }));
  }

  const subtotal = value.items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
  const { cgst, sgst, igst } = computeTax(subtotal, value.tax_type, value.tax_rate);
  const { totalAmount } = computeTotal(subtotal, cgst, sgst, igst, 0, [], []);

  async function save() {
    if (saving) return;
    if (!value.supplier_name.trim()) {
      setError("Supplier name is required.");
      return;
    }
    if (!value.items.some((it) => it.description.trim() && (it.qty || 0) > 0)) {
      setError("Add at least one line item with a description and quantity.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        doc_type: "purchase",
        doc_number: value.doc_number,
        doc_date: value.doc_date,
        bill_to_name: value.supplier_name,
        bill_to_address: value.supplier_address,
        bill_to_contact_person: value.supplier_contact_person,
        bill_to_contact_number: value.supplier_contact_number,
        bill_to_gst: value.supplier_gst,
        tax_type: value.tax_type,
        tax_rate: value.tax_rate,
        remarks: value.remarks || null,
        status: value.status || "draft",
        items: value.items.map((it) => ({
          description: it.description,
          size: it.size,
          hsn_code: it.hsn_code,
          qty: it.qty,
          unit: it.unit,
          rate: it.rate,
        })),
      };
      const url = value.id ? `/api/purchases/${value.id}` : "/api/purchases";
      const res = await fetch(url, {
        method: value.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.document) {
        router.push(`/purchases/${json.document.id}`);
        router.refresh();
      } else {
        setError(json.error || "Could not save purchase.");
      }
    } catch {
      setError("Could not save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4">
        <h2 className="label">Supplier</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Supplier name *</label>
            <input className="input" value={value.supplier_name} onChange={(e) => patch({ supplier_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Contact number</label>
            <input className="input" value={value.supplier_contact_number} onChange={(e) => patch({ supplier_contact_number: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <input className="input" value={value.supplier_address} onChange={(e) => patch({ supplier_address: e.target.value })} />
          </div>
          <div>
            <label className="label">Contact person</label>
            <input className="input" value={value.supplier_contact_person} onChange={(e) => patch({ supplier_contact_person: e.target.value })} />
          </div>
          <div>
            <label className="label">Supplier GST</label>
            <input className="input" value={value.supplier_gst} onChange={(e) => patch({ supplier_gst: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={value.doc_date} onChange={(e) => patch({ doc_date: e.target.value })} />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="label mb-3">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="p-2">Description</th>
                <th className="p-2">Size</th>
                <th className="p-2">HSN</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Rate</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {value.items.map((it, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-2">
                    <input className="input !min-h-[30px] !py-1.5 text-xs" value={it.description} onChange={(e) => patchItem(i, { description: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <input className="input !min-h-[30px] !py-1.5 text-xs" value={it.size} onChange={(e) => patchItem(i, { size: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <input className="input !min-h-[30px] !py-1.5 text-xs" value={it.hsn_code} onChange={(e) => patchItem(i, { hsn_code: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <input type="number" min="0" step="any" className="input !min-h-[30px] !py-1.5 text-xs" value={it.qty || ""} placeholder="0" onChange={(e) => patchItem(i, { qty: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td className="p-2">
                    <select className="input !min-h-[30px] !py-1.5 text-xs" value={it.unit} onChange={(e) => patchItem(i, { unit: e.target.value })}>
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input type="number" min="0" step="any" className="input !min-h-[30px] !py-1.5 text-xs" value={it.rate || ""} placeholder="0" onChange={(e) => patchItem(i, { rate: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td className="p-2 text-right font-mono text-xs whitespace-nowrap">
                    {inr((it.qty || 0) * (it.rate || 0), 2)}
                  </td>
                  <td className="p-2">
                    <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addItem} className="mt-3 w-full border border-dashed border-slate-300 text-brand-600 font-mono text-xs py-2 rounded-lg hover:border-brand-500 transition">
          + Add item
        </button>
      </div>

      <div className="card p-5">
        <h2 className="label mb-3">Tax &amp; Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Tax type</label>
            <select className="input" value={value.tax_type} onChange={(e) => {
              const t = e.target.value as PurchaseFormValue["tax_type"];
              patch({ tax_type: t, tax_rate: t === "none" ? 0 : 0.18 });
            }}>
              <option value="cgst_sgst">CGST + SGST</option>
              <option value="igst">IGST</option>
              <option value="none">None</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={value.status} onChange={(e) => patch({ status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="label">Remarks</label>
            <input className="input" value={value.remarks} onChange={(e) => patch({ remarks: e.target.value })} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="text-sm text-slate-500">
            Subtotal: <span className="font-semibold text-slate-800">{inr(subtotal, 2)}</span>
            {value.tax_type !== "none" && (
              <span className="ml-3">
                Tax: <span className="font-semibold text-slate-800">{inr(cgst + sgst + igst, 2)}</span>
              </span>
            )}
          </div>
          <div className="text-lg font-bold">
            Total: {inr(totalAmount, 2)}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className="btn-primary flex-1 sm:flex-none">
          {saving ? "Saving…" : value.id ? "Save changes" : "Save purchase"}
        </button>
        <a href="/purchases" className="btn-secondary">Cancel</a>
      </div>
    </div>
  );
}
