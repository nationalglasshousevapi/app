"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { DOC_TYPES, docTypeLabel, DocType } from "@/lib/docTypes";
import CustomerPicker from "./CustomerPicker";
import NewCustomerModal from "./NewCustomerModal";
import CalendarInput from "./CalendarInput";
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
  discount_amount: number;
  transport_charges: number;
  packing_forwarding_charges: number;
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
    discount_amount: 0,
    transport_charges: 0,
    packing_forwarding_charges: 0,
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
  const [customerPickerKey, setCustomerPickerKey] = useState(0);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [customizingBilling, setCustomizingBilling] = useState(false);
  const isNewInvoice = !initial.id && !value.customer_id;
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
      "discount_amount",
      "transport_charges",
      "packing_forwarding_charges",
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
        Number(v.rate) !== Number(init.rate) ||
        Number(v.actual_length) !== Number(init.actual_length) ||
        Number(v.actual_width) !== Number(init.actual_width) ||
        Number(v.nos) !== Number(init.nos) ||
        Number(v.calculated_length) !== Number(init.calculated_length) ||
        Number(v.calculated_width) !== Number(init.calculated_width)
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

  function handleCustomerCreated(c: Customer) {
    selectCustomer(c);
    setShowNewCustomerModal(false);
  }

  const totals = useMemo(() => {
    const subtotal = value.items.reduce((sum, it) => sum + (it.qty || 0) * (it.rate || 0), 0);
    const discount = value.discount_amount || 0;
    const taxableAmount = subtotal - discount;
    const transport = value.transport_charges || 0;
    const packing = value.packing_forwarding_charges || 0;
    let cgst = 0,
      sgst = 0,
      igst = 0;
    if (value.tax_type === "cgst_sgst") {
      cgst = Math.round(((taxableAmount * value.tax_rate) / 2) * 100) / 100;
      sgst = cgst;
    } else if (value.tax_type === "igst") {
      igst = Math.round(taxableAmount * value.tax_rate * 100) / 100;
    }
    const total = Math.round((taxableAmount + cgst + sgst + igst + (value.round_off || 0) + transport + packing) * 100) / 100;
    return { subtotal, discount, taxableAmount, cgst, sgst, igst, transport, packing, total };
  }, [value.items, value.tax_type, value.tax_rate, value.round_off, value.discount_amount, value.transport_charges, value.packing_forwarding_charges]);

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
    const discount = value.discount_amount || 0;
    const taxableAmount = subtotal - discount;
    const transport = value.transport_charges || 0;
    const packing = value.packing_forwarding_charges || 0;
    let cgst = 0, sgst = 0, igst = 0;
    if (value.tax_type === "cgst_sgst") {
      cgst = Math.round(((taxableAmount * value.tax_rate) / 2) * 100) / 100;
      sgst = cgst;
    } else if (value.tax_type === "igst") {
      igst = Math.round(taxableAmount * value.tax_rate * 100) / 100;
    }
    const total = Math.round((taxableAmount + cgst + sgst + igst + (value.round_off || 0) + transport + packing) * 100) / 100;

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
          actual_length: it.actual_length || 0,
          actual_width: it.actual_width || 0,
          nos: it.nos || 1,
          calculated_length: it.calculated_length || 0,
          calculated_width: it.calculated_width || 0,
        }))}
        subtotal={subtotal}
        discountAmount={discount}
        taxType={value.tax_type}
        taxRate={value.tax_rate}
        cgstAmount={cgst}
        sgstAmount={sgst}
        igstAmount={igst}
        roundOff={value.round_off || 0}
        transportCharges={transport}
        packingForwardingCharges={packing}
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
    <><form onSubmit={save} className="space-y-6">
      {/* Step 1: Customer — always shown first */}
      <div className="card p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 shrink-0">1</span>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Select customer</h2>
            <p className="text-xs text-slate-500">Search saved customers or create a new one.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <CustomerPicker key={customerPickerKey} onSelect={selectCustomer} initialName={value.bill_to_name} />
          </div>
          <button
            type="button"
            onClick={() => setShowNewCustomerModal(true)}
            className="btn-secondary px-3 py-3.5 shrink-0 text-sm"
            title="Create new customer"
          >
            + New
          </button>
          {value.customer_id && (
            <button
              type="button"
              onClick={() => {
                patch({
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
                });
                setSameAsBilling(true);
                setCustomerPickerKey((k) => k + 1);
              }}
              className="btn-secondary px-3 py-3.5 shrink-0 text-sm"
              title="Clear customer"
            >
              Clear
            </button>
          )}
        </div>
        {value.customer_id && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-1">
            <p className="font-semibold text-slate-900">{value.bill_to_name}</p>
            {value.bill_to_address && <p className="text-sm text-slate-500">{value.bill_to_address}</p>}
            {value.bill_to_gst && <p className="text-sm text-slate-400">GST: {value.bill_to_gst}</p>}
          </div>
        )}
      </div>

      {/* Remaining sections — hidden for new docs until a customer is selected */}
      {!isNewInvoice && (
        <>
          {/* Document details */}
          <div className="card p-5 md:p-6 grid md:grid-cols-4 gap-4">
            <div className="md:col-span-4 flex items-center gap-3 pb-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 shrink-0">2</span>
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
                {DOC_TYPES.filter((t) => t.value !== "receipt").map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {value.id && <p className="text-xs text-gray-400 mt-1">Type can't be changed after creation</p>}
            </div>
            <div>
              <label className="label">Date <span className="text-red-500">*</span></label>
              <CalendarInput value={value.doc_date} onChange={(v) => patch({ doc_date: v })} required />
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
              <CalendarInput value={value.order_date} onChange={(v) => patch({ order_date: v })} />
            </div>
          </div>

          {/* Billing / Shipping details — read-only summary with optional customize */}
          <div className="card p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 shrink-0">3</span>
              <div className="flex-1">
                <h2 className="font-bold text-slate-900 text-lg">Billing details</h2>
              </div>
              {value.customer_id && (
                <button
                  type="button"
                  onClick={() => setCustomizingBilling((v) => !v)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  {customizingBilling ? "Done" : "Customize"}
                </button>
              )}
            </div>

            {customizingBilling ? (
              /* Editable mode — when "Customize" is active */
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Override billing details for this document only.</p>
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

                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    !sameAsBilling ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
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
                </div>
              </div>
            ) : (
              /* Read-only summary card */
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-xs font-medium">Name:</span>
                  <span className="text-slate-900 font-medium">{value.bill_to_name}</span>
                </div>
                {value.bill_to_gst && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-xs font-medium">GST:</span>
                    <span className="text-sm text-slate-600">{value.bill_to_gst}</span>
                  </div>
                )}
                {value.bill_to_address && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-xs font-medium">Address:</span>
                    <span className="text-sm text-slate-600">{value.bill_to_address}</span>
                  </div>
                )}
                {value.bill_to_contact_person && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-xs font-medium">Contact:</span>
                    <span className="text-sm text-slate-600">{value.bill_to_contact_person}</span>
                  </div>
                )}
                {value.bill_to_contact_number && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-xs font-medium">Phone:</span>
                    <span className="text-sm text-slate-600">{value.bill_to_contact_number}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items and pricing */}
          <div className="card p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 shrink-0">4</span>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Items and pricing</h2>
                <p className="text-xs text-slate-500">Add each product or service as a separate line.</p>
              </div>
            </div>
            <LineItemsEditor items={value.items} onChange={(items) => patch({ items })} docType={value.doc_type} />
          </div>

          {/* Tax, charges, and notes */}
          <div className="card p-5 md:p-6 grid md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 shrink-0">5</span>
                <h2 className="font-bold text-slate-900 text-lg">Tax &amp; charges</h2>
              </div>

              {/* Tax section */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">Tax</h3>
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
                  <label className="label">Tax Rate</label>
                  <div className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={Math.round(value.tax_rate * 100 * 10) / 10}
                      onChange={(e) => patch({ tax_rate: Math.max(0, Number(e.target.value) / 100) })}
                    />
                    <span className="text-sm text-slate-500 font-medium w-5">%</span>
                  </div>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {[0, 5, 12, 18, 28].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => patch({ tax_rate: pct / 100 })}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition ${
                          Math.round(value.tax_rate * 100) === pct
                            ? "bg-brand-600 text-white border-brand-600"
                            : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Charges section */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">Charges</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Transport</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={value.transport_charges}
                      onChange={(e) => patch({ transport_charges: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="label">Packing &amp; Fwd.</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={value.packing_forwarding_charges}
                      onChange={(e) => patch({ packing_forwarding_charges: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Adjustments section */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">Adjustments</h3>
                <div>
                  <label className="label">Discount</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={value.discount_amount}
                    onChange={(e) => patch({ discount_amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Round Off (can be negative or positive)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={value.round_off}
                    onChange={(e) => patch({ round_off: Number(e.target.value) })}
                  />
                </div>
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

            <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5 space-y-2 self-start md:sticky md:top-6">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700 mb-3">Document total</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span>₹ {totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-red-600">- ₹ {totals.discount.toFixed(2)}</span>
                </div>
              )}
              {totals.transport > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Transport</span>
                  <span>₹ {totals.transport.toFixed(2)}</span>
                </div>
              )}
              {totals.packing > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Packing &amp; Fwd.</span>
                  <span>₹ {totals.packing.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-brand-100" />
              {value.tax_type === "cgst_sgst" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Taxable amount</span>
                    <span>₹ {totals.taxableAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>CGST @ {((value.tax_rate * 100) / 2).toFixed(1)}%</span>
                    <span>₹ {totals.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>SGST @ {((value.tax_rate * 100) / 2).toFixed(1)}%</span>
                    <span>₹ {totals.sgst.toFixed(2)}</span>
                  </div>
                </>
              )}
              {value.tax_type === "igst" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Taxable amount</span>
                    <span>₹ {totals.taxableAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>IGST @ {(value.tax_rate * 100).toFixed(1)}%</span>
                    <span>₹ {totals.igst.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-brand-100">
                <span className="text-slate-500">Round Off</span>
                <span className={value.round_off < 0 ? "text-red-600" : ""}>
                  {value.round_off < 0 ? "" : "+"}₹ {(value.round_off || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-3 border-t border-brand-100">
                <span>Total</span>
                <span>₹ {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
              {saving ? "Saving…" : value.id ? "Save changes" : `Save ${docTypeLabel(value.doc_type)}`}
            </button>
            <div className="flex items-center gap-3 flex-wrap">
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
                <a href={`/api/documents/${value.id}/pdf`} target="_blank" className="btn-secondary">
                  View PDF
                </a>
              )}
              {value.id && isDirty && (
                <span className="text-xs text-amber-600 font-medium">
                  Save changes to update PDF
                </span>
              )}
            </div>
          </div>
          {saveError ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          ) : null}
        </>
      )}

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <NewCustomerModal
          onClose={() => setShowNewCustomerModal(false)}
          onCreated={handleCustomerCreated}
        />
      )}
    </form>
    </>
  );
}