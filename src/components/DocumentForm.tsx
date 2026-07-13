"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { DOC_TYPES, docTypeLabel, DocType } from "@/lib/docTypes";
import CustomerPicker from "./CustomerPicker";
import LineItemsEditor, { EMPTY_ITEM, LineItem } from "./LineItemsEditor";
import PdfDocument from "./PdfDocument";
import type { CompanyDetails } from "@/lib/company";

type Customer = {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  contact_number: string | null;
  email: string | null;
  gst: string | null;
};

export type DocumentFormValue = {
  id?: string;
  doc_type: DocType;
  doc_number?: string;
  doc_date: string;
  order_number: string;
  order_date: string;
  customer_id: string | null;
  bill_to_name: string;
  bill_to_address: string;
  bill_to_contact_person: string;
  bill_to_contact_number: string;
  bill_to_email: string;
  bill_to_gst: string;
  ship_to_name: string;
  ship_to_address: string;
  ship_to_contact_person: string;
  ship_to_contact_number: string;
  tax_type: "cgst_sgst" | "igst" | "none";
  tax_rate: number;
  round_off: number;
  remarks: string;
  status: string;
  items: LineItem[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function blankDocument(defaultType: DocType = "invoice"): DocumentFormValue {
  return {
    doc_type: defaultType,
    doc_date: today(),
    order_number: "",
    order_date: "",
    customer_id: null,
    bill_to_name: "",
    bill_to_address: "",
    bill_to_contact_person: "",
    bill_to_contact_number: "",
    bill_to_email: "",
    bill_to_gst: "",
    ship_to_name: "",
    ship_to_address: "",
    ship_to_contact_person: "",
    ship_to_contact_number: "",
    tax_type: "cgst_sgst",
    tax_rate: 0.18,
    round_off: 0,
    remarks: "",
    status: "draft",
    items: [{ ...EMPTY_ITEM }],
  };
}

export default function DocumentForm({
  initial,
}: {
  initial: DocumentFormValue;
}) {
  const [value, setValue] = useState<DocumentFormValue>(initial);
  const [sameAsBilling, setSameAsBilling] = useState(() => {
    return (
      !initial.id ||
      (initial.ship_to_name === initial.bill_to_name &&
        initial.ship_to_address === initial.bill_to_address &&
        initial.ship_to_contact_person === initial.bill_to_contact_person &&
        initial.ship_to_contact_number === initial.bill_to_contact_number)
    );
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const router = useRouter();

  const isDirty = useMemo(() => {
    const keys: (keyof DocumentFormValue)[] = [
      "doc_type",
      "doc_date",
      "order_number",
      "order_date",
      "customer_id",
      "bill_to_name",
      "bill_to_address",
      "bill_to_contact_person",
      "bill_to_contact_number",
      "bill_to_email",
      "bill_to_gst",
      "ship_to_name",
      "ship_to_address",
      "ship_to_contact_person",
      "ship_to_contact_number",
      "tax_type",
      "tax_rate",
      "round_off",
      "remarks",
      "status",
    ];

    for (const key of keys) {
      if (value[key] !== initial[key]) {
        return true;
      }
    }

    if (value.items.length !== initial.items.length) {
      return true;
    }

    for (let i = 0; i < value.items.length; i++) {
      const v = value.items[i];
      const init = initial.items[i];
      if (!init) return true;
      if (
        v.description !== init.description ||
        v.size !== init.size ||
        v.hsn_code !== init.hsn_code ||
        Number(v.qty) !== Number(init.qty) ||
        v.unit !== init.unit ||
        Number(v.rate) !== Number(init.rate)
      ) {
        return true;
      }
    }

    const initialSameAsBilling = !initial.id || (
      initial.ship_to_name === initial.bill_to_name &&
      initial.ship_to_address === initial.bill_to_address &&
      initial.ship_to_contact_person === initial.bill_to_contact_person &&
      initial.ship_to_contact_number === initial.bill_to_contact_number
    );
    if (sameAsBilling !== initialSameAsBilling) {
      return true;
    }

    return false;
  }, [value, initial, sameAsBilling]);

  function patch(p: Partial<DocumentFormValue>) {
    setValue((v) => ({ ...v, ...p }));
  }

  function selectCustomer(c: Customer) {
    patch({
      customer_id: c.id,
      bill_to_name: c.name,
      bill_to_address: c.address ?? "",
      bill_to_contact_person: c.contact_person ?? "",
      bill_to_contact_number: c.contact_number ?? "",
      bill_to_email: c.email ?? "",
      bill_to_gst: c.gst ?? "",
      ...(sameAsBilling
        ? {
            ship_to_name: c.name,
            ship_to_address: c.address ?? "",
            ship_to_contact_person: c.contact_person ?? "",
            ship_to_contact_number: c.contact_number ?? "",
          }
        : {}),
    });
  }

  const totals = useMemo(() => {
    const subtotal = value.items.reduce((sum, it) => sum + (it.qty || 0) * (it.rate || 0), 0);
    let cgst = 0,
      sgst = 0,
      igst = 0;
    if (value.tax_type === "cgst_sgst") {
      cgst = Math.round(((subtotal * value.tax_rate) / 2) * 100) / 100;
      sgst = cgst;
    } else if (value.tax_type === "igst") {
      igst = Math.round(subtotal * value.tax_rate * 100) / 100;
    }
    const total = Math.round((subtotal + cgst + sgst + igst + (value.round_off || 0)) * 100) / 100;
    return { subtotal, cgst, sgst, igst, total };
  }, [value.items, value.tax_type, value.tax_rate, value.round_off]);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!value.bill_to_name.trim()) {
      errors.bill_to_name = "Customer name is required.";
    }
    value.items.forEach((item, idx) => {
      if (!item.description.trim()) {
        errors[`items.${idx}.description`] = "Description is required.";
      }
      if (!item.qty || item.qty <= 0) {
        errors[`items.${idx}.qty`] = "Quantity must be greater than 0.";
      }
      if (item.rate < 0) {
        errors[`items.${idx}.rate`] = "Rate cannot be negative.";
      }
    });
    return errors;
  }

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function previewPdf() {
    if (companyLoading) return;
    setCompanyLoading(true);
    let c = company;
    if (!c) {
      try {
        const res = await fetch("/api/company");
        c = await res.json();
        setCompany(c);
      } catch {
        alert("Could not load company details for preview.");
        setCompanyLoading(false);
        return;
      }
    }
    setCompanyLoading(false);
    if (!c) return;

    const subtotal = value.items.reduce((sum, it) => sum + (it.qty || 0) * (it.rate || 0), 0);
    let cgst = 0, sgst = 0, igst = 0;
    if (value.tax_type === "cgst_sgst") {
      cgst = Math.round(((subtotal * value.tax_rate) / 2) * 100) / 100;
      sgst = cgst;
    } else if (value.tax_type === "igst") {
      igst = Math.round(subtotal * value.tax_rate * 100) / 100;
    }
    const total = Math.round((subtotal + cgst + sgst + igst + (value.round_off || 0)) * 100) / 100;

    const pdfDoc = pdf(
      <PdfDocument
        docType={value.doc_type}
        docNumber="PREVIEW"
        docDate={value.doc_date}
        orderNumber={value.order_number || null}
        orderDate={value.order_date || null}
        company={c}
        billTo={{
          name: value.bill_to_name,
          address: value.bill_to_address || null,
          contactPerson: value.bill_to_contact_person || null,
          contactNumber: value.bill_to_contact_number || null,
          email: value.bill_to_email || null,
          gst: value.bill_to_gst || null,
        }}
        shipTo={{
          name: value.ship_to_name || null,
          address: value.ship_to_address || null,
          contactPerson: value.ship_to_contact_person || null,
          contactNumber: value.ship_to_contact_number || null,
        }}
        items={value.items.map((it) => ({
          description: it.description,
          size: it.size || null,
          hsn_code: it.hsn_code || null,
          qty: it.qty || 0,
          unit: it.unit || null,
          rate: it.rate || 0,
          total: Math.round((it.qty || 0) * (it.rate || 0) * 100) / 100,
        }))}
        subtotal={subtotal}
        taxType={value.tax_type}
        taxRate={value.tax_rate}
        cgstAmount={cgst}
        sgstAmount={sgst}
        igstAmount={igst}
        roundOff={value.round_off || 0}
        totalAmount={total}
        remarks={value.remarks || null}
      />
    );
    const blob = await pdfDoc.toBlob();
    window.open(URL.createObjectURL(blob), "_blank");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSaving(true);
    const payload = {
      ...value,
      ship_to_name: sameAsBilling ? value.bill_to_name : value.ship_to_name,
      ship_to_address: sameAsBilling ? value.bill_to_address : value.ship_to_address,
      ship_to_contact_person: sameAsBilling ? value.bill_to_contact_person : value.ship_to_contact_person,
      ship_to_contact_number: sameAsBilling ? value.bill_to_contact_number : value.ship_to_contact_number,
    };

    try {
      const res = await fetch(value.id ? `/api/documents/${value.id}` : "/api/documents", {
        method: value.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(json.error ?? "Unable to save. Please try again.");
        return;
      }
      router.push(`/documents/${json.document.id}`);
      router.refresh();
    } catch {
      setSaveError("Unable to reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="card p-5 md:p-6 grid md:grid-cols-4 gap-4">
        <div className="md:col-span-4 flex items-center gap-3 pb-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 shrink-0">1</span>
          <h2 className="font-bold text-slate-900 text-lg">Document details</h2>
        </div>
        <div>
          <label className="label">Document Type</label>
          <select
            className="input"
            value={value.doc_type}
            disabled={!!value.id}
            onChange={(e) => patch({ doc_type: e.target.value as DocType })}
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {value.id && <p className="text-xs text-gray-400 mt-1">Type can't be changed after creation</p>}
        </div>
        <div>
          <label className="label">Date <span className="text-red-500">*</span></label>
          <input
            type="date"
            className="input"
            value={value.doc_date}
            onChange={(e) => patch({ doc_date: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Order Number</label>
          <input
            className="input"
            value={value.order_number}
            onChange={(e) => patch({ order_number: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Order Date</label>
          <input
            type="date"
            className="input"
            value={value.order_date}
            onChange={(e) => patch({ order_date: e.target.value })}
          />
        </div>
      </div>

      <div className="card p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 shrink-0">2</span>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Customer details</h2>
            <p className="text-xs text-slate-500">Search saved customers, or enter details below.</p>
          </div>
        </div>
        <CustomerPicker onSelect={selectCustomer} initialName={value.bill_to_name} />
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input
              className={`input ${fieldErrors.bill_to_name ? "border-red-400 focus:ring-red-400/30" : ""}`}
              value={value.bill_to_name}
              onChange={(e) => { patch({ bill_to_name: e.target.value }); clearFieldError("bill_to_name"); }}
              required
            />
            {fieldErrors.bill_to_name && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.bill_to_name}</p>
            )}
          </div>
          <div>
            <label className="label">GST</label>
            <input
              className="input"
              value={value.bill_to_gst}
              onChange={(e) => patch({ bill_to_gst: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input
              className="input"
              value={value.bill_to_address}
              onChange={(e) => patch({ bill_to_address: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Contact Person</label>
            <input
              className="input"
              value={value.bill_to_contact_person}
              onChange={(e) => patch({ bill_to_contact_person: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Contact Number</label>
            <input
              className="input"
              value={value.bill_to_contact_number}
              onChange={(e) => patch({ bill_to_contact_number: e.target.value })}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 rounded-xl bg-slate-50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(e) => setSameAsBilling(e.target.checked)}
          />
          Ship to same as billing
        </label>

        {!sameAsBilling && (
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="label">Ship To Name</label>
              <input
                className="input"
                value={value.ship_to_name}
                onChange={(e) => patch({ ship_to_name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Ship To Address</label>
              <input
                className="input"
                value={value.ship_to_address}
                onChange={(e) => patch({ ship_to_address: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="card p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 shrink-0">3</span>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Items and pricing</h2>
            <p className="text-xs text-slate-500">Add each product or service as a separate line.</p>
          </div>
        </div>
        <LineItemsEditor items={value.items} onChange={(items) => patch({ items })} />
      </div>

      <div className="card p-5 md:p-6 grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 shrink-0">4</span>
            <h2 className="font-bold text-slate-900 text-lg">Tax and notes</h2>
          </div>
          <div>
            <label className="label">Tax Type</label>
            <select
              className="input"
              value={value.tax_type}
              onChange={(e) => patch({ tax_type: e.target.value as DocumentFormValue["tax_type"] })}
            >
              <option value="cgst_sgst">CGST + SGST (intra-state)</option>
              <option value="igst">IGST (inter-state)</option>
              <option value="none">No Tax</option>
            </select>
          </div>
          <div>
            <label className="label">Tax Rate (combined, e.g. 0.18 = 18%)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={value.tax_rate}
              onChange={(e) => patch({ tax_rate: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Round Off</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={value.round_off}
              onChange={(e) => patch({ round_off: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea
              className="input"
              rows={3}
              value={value.remarks}
              onChange={(e) => patch({ remarks: e.target.value })}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5 space-y-2 self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700 mb-3">Document total</p>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span>Rs. {totals.subtotal.toFixed(2)}</span>
          </div>
          {value.tax_type === "cgst_sgst" && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">CGST</span>
                <span>Rs. {totals.cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">SGST</span>
                <span>Rs. {totals.sgst.toFixed(2)}</span>
              </div>
            </>
          )}
          {value.tax_type === "igst" && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">IGST</span>
              <span>Rs. {totals.igst.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Round Off</span>
            <span>Rs. {(value.round_off || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-3 border-t border-brand-100">
            <span>Total</span>
            <span>Rs. {totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : value.id ? "Save changes" : `Save ${docTypeLabel(value.doc_type)}`}
        </button>
        <button
          type="button"
          onClick={previewPdf}
          disabled={companyLoading || !value.bill_to_name.trim() || value.items.some((it) => !it.description.trim() || it.qty <= 0 || it.rate < 0)}
          className="btn-secondary"
          title={(!value.bill_to_name.trim() || value.items.some((it) => !it.description.trim() || it.qty <= 0 || it.rate < 0)) ? "Fill required fields first" : "Preview as PDF"}
        >
          {companyLoading ? "Loading…" : "Preview PDF"}
        </button>
        {value.id && (
          isDirty ? (
            <a href={`/api/documents/${value.id}/pdf`} target="_blank" className="btn-secondary">
              View PDF
            </a>
          ) : (
            <a href={`/api/documents/${value.id}/pdf`} target="_blank" className="btn-secondary">
              View PDF
            </a>
          )
        )}
        {value.id && isDirty && (
          <span className="text-xs text-amber-600 font-medium">
            Save changes to update PDF
          </span>
        )}
      </div>
      {saveError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}
    </form>
  );
}
