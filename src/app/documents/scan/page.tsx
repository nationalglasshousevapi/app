"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DocumentForm, {
  blankDocument,
  DocumentFormValue,
} from "@/components/DocumentForm";
import { LineItem } from "@/components/LineItemsEditor";
import { DocType } from "@/lib/docTypes";
import { DEFAULT_HSN_CODE } from "@/lib/company";
import { deriveGlassItemFields } from "@/lib/documents";
import type {
  ExtractedSalesDocument,
  ExtractedSalesItem,
} from "@/lib/salesOcr";
import { MAX_UPLOAD_BYTES } from "@/lib/scanFile";
import { downscaleImage } from "@/lib/downscaleImage";

const SALES_TYPES: { value: DocType; label: string }[] = [
  { value: "quotation", label: "Quotation" },
  { value: "order", label: "Order" },
  { value: "performa_invoice", label: "Performa Invoice" },
  { value: "invoice", label: "Invoice" },
  { value: "estimate", label: "Estimate" },
];

function toLineItem(it: ExtractedSalesItem): LineItem {
  const actual_length = it.actual_length_in || 0;
  const actual_width = it.actual_width_in || 0;
  const nos = Math.max(1, Math.round(it.nos) || 1);
  const unit = ["sq.ft", "rn ft", "nos"].includes(it.unit) ? it.unit : "sq.ft";
  const derived = deriveGlassItemFields({
    actual_length,
    actual_width,
    nos,
    unit,
  });

  let qty = derived.qty;
  if (qty <= 0 && it.rate > 0 && it.amount > 0) {
    qty = Math.round((it.amount / it.rate) * 100) / 100;
  }
  if (qty <= 0) qty = nos;

  return {
    description: it.description || "Glass",
    size: derived.size,
    hsn_code: it.hsn_code || DEFAULT_HSN_CODE,
    qty,
    unit,
    rate: it.rate,
    actual_length,
    actual_width,
    nos,
    calculated_length: derived.calculated_length,
    calculated_width: derived.calculated_width,
    item_type: "glass",
  };
}

function extractedToFormValue(
  ex: ExtractedSalesDocument,
  docType: DocType
): DocumentFormValue {
  const base = blankDocument(docType);
  return {
    ...base,
    doc_date: ex.doc_date || base.doc_date,
    bill_to_name: ex.customer_name,
    bill_to_address: ex.customer_address,
    bill_to_contact_person: ex.customer_contact_person,
    bill_to_contact_number: ex.customer_contact_number,
    bill_to_email: ex.customer_email,
    bill_to_gst: ex.customer_gst,
    ship_to_name: ex.customer_name,
    ship_to_address: ex.customer_address,
    ship_to_contact_person: ex.customer_contact_person,
    ship_to_contact_number: ex.customer_contact_number,
    items: ex.items.length ? ex.items.map(toLineItem) : base.items,
  };
}

function fileSizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function ScanDocumentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState<ExtractedSalesDocument | null>(
    null
  );
  const [selectedType, setSelectedType] = useState<DocType | null>(null);

  const initial = useMemo(
    () =>
      extracted && selectedType
        ? extractedToFormValue(extracted, selectedType)
        : null,
    [extracted, selectedType]
  );

  async function pick(f: File | null) {
    setError("");
    setExtracted(null);
    setSelectedType(null);
    if (!f) {
      setFile(null);
      setPreviewUrl("");
      return;
    }
    if (f.type === "application/pdf") {
      if (f.size > MAX_UPLOAD_BYTES) {
        setFile(null);
        setPreviewUrl("");
        setError(
          "This PDF is too large (max 4 MB). Try a smaller file or photograph the document."
        );
        return;
      }
      setFile(f);
      setPreviewUrl("");
      return;
    }
    const downscaled = await downscaleImage(f);
    setFile(downscaled);
    setPreviewUrl(URL.createObjectURL(downscaled));
  }

  async function runExtraction() {
    if (!file || extracting) return;
    setExtracting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents/extract", {
        method: "POST",
        body: fd,
      });
      let json: { extracted?: ExtractedSalesDocument; error?: string } | null =
        null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (!res.ok || !json?.extracted) {
        setError(
          json?.error ||
            (res.status === 413
              ? "This file is too large to upload (max 4 MB). Try a smaller file or photograph the document."
              : "Could not read the document. Please enter details manually.")
        );
      } else {
        setExtracted(json.extracted);
        setSelectedType(null);
      }
    } catch {
      setError("Network error while extracting. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  function reset() {
    setExtracted(null);
    setSelectedType(null);
    setFile(null);
    setPreviewUrl("");
  }

  if (initial) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm">
          <span className="text-sky-900 font-medium">
            AI-extracted draft — please verify every line against the original
            before saving.
          </span>
          <button
            onClick={reset}
            className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
          >
            Re-scan
          </button>
        </div>
        <DocumentForm key={selectedType ?? "doc"} initial={initial} />
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-2xl">
      <Link
        href="/documents"
        className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
      >
        <span>&larr;</span> Back to Documents
      </Link>
      <div>
        <p className="text-sm font-semibold text-brand-600">Scan to entry</p>
        <h1 className="page-title">Scan Sales Document</h1>
        <p className="page-subtitle">
          Upload a quotation, order, performa invoice, or invoice PDF/photo. The
          details are read into an editable draft — then choose the document
          type before saving.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <label className="label">Document file (photo or PDF)</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
        />
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Document preview"
            className="max-h-96 rounded-lg border border-slate-200 object-contain"
          />
        )}
        {file && !previewUrl && (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
            <span aria-hidden>📄</span>
            <span className="truncate font-medium text-slate-700">
              {file.name}
            </span>
            <span className="ml-auto shrink-0 text-xs text-slate-500">
              {fileSizeLabel(file.size)}
            </span>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={runExtraction}
          disabled={!file || extracting}
          className="btn-primary w-full sm:w-auto disabled:opacity-50"
        >
          {extracting ? "Reading document…" : "Extract details"}
        </button>
      </div>

      {extracted && (
        <div className="card p-5 space-y-4">
          <h2 className="label">Extracted summary</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="inline font-semibold">Customer: </dt>
              <dd className="inline">{extracted.customer_name || "—"}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Document no.: </dt>
              <dd className="inline">{extracted.doc_number || "—"}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Date: </dt>
              <dd className="inline">{extracted.doc_date || "—"}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">GSTIN: </dt>
              <dd className="inline">{extracted.customer_gst || "—"}</dd>
            </div>
          </dl>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="p-1.5">Description</th>
                <th className="p-1.5">L×W</th>
                <th className="p-1.5">Nos</th>
                <th className="p-1.5 text-right">Rate</th>
                <th className="p-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {extracted.items.map((it, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="p-1.5">{it.description}</td>
                  <td className="p-1.5">
                    {it.actual_length_in > 0 && it.actual_width_in > 0
                      ? `${it.actual_length_in}×${it.actual_width_in}`
                      : "—"}
                  </td>
                  <td className="p-1.5">{it.nos}</td>
                  <td className="p-1.5 text-right">{it.rate}</td>
                  <td className="p-1.5 text-right font-mono">
                    {(it.amount > 0 ? it.amount : 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pt-2">
            <h3 className="label mb-2">What type of document is this?</h3>
            <div className="flex flex-wrap gap-2">
              {SALES_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSelectedType(t.value)}
                  className="btn-secondary text-sm"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
