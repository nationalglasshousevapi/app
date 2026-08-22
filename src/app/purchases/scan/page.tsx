"use client";

import { useState } from "react";
import Link from "next/link";
import PurchaseForm, { blankPurchase, PurchaseFormValue } from "@/components/PurchaseForm";
import type { ExtractedPurchase } from "@/lib/ocr";

function extractedToFormValue(ex: ExtractedPurchase): PurchaseFormValue {
  const base = blankPurchase();
  return {
    ...base,
    doc_number: ex.doc_number || base.doc_number,
    doc_date: ex.doc_date || base.doc_date,
    supplier_name: ex.supplier_name,
    supplier_address: ex.supplier_address,
    supplier_gst: ex.supplier_gst,
    irn: ex.irn,
    ack_number: ex.ack_number,
    place_of_supply: ex.place_of_supply,
    bilty_number: ex.bilty_number,
    vehicle_number: ex.vehicle_number,
    tax_type: ex.tax_type === "cgst_sgst" ? "cgst_sgst" : ex.tax_type === "none" ? "none" : "igst",
    tax_rate: (ex.tax_rate_percent || 18) / 100,
    remarks: "",
    status: "draft",
    items: ex.items.map((it) => ({
      description: it.description,
      size: "",
      hsn_code: it.hsn_code || base.items[0].hsn_code,
      qty: it.qty_mts,
      unit: "mts",
      rate: it.rate,
      thickness: it.thickness,
      width_mm: it.width_mm,
      length_mm: it.length_mm,
      pcs: it.pcs,
    })),
  };
}

// Downscale large camera photos in-browser so previews render fast on
// low-end devices and uploads are smaller.
async function downscaleImage(file: File, maxDim = 2000): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function ScanPurchasePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState<ExtractedPurchase | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function pick(f: File | null) {
    setError("");
    setExtracted(null);
    if (!f) {
      setFile(null);
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
      const res = await fetch("/api/purchases/extract", { method: "POST", body: fd });
      const json: { extracted?: ExtractedPurchase; error?: string } = await res.json();
      if (!res.ok || !json.extracted) {
        setError(json.error || "Could not read the invoice. Please enter details manually.");
      } else {
        setExtracted(json.extracted);
      }
    } catch {
      setError("Network error while extracting. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  if (confirmed && extracted) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm">
          <span className="text-sky-900 font-medium">
            AI-extracted draft — please compare every amount against the paper invoice before saving.
          </span>
          <button
            onClick={() => { setConfirmed(false); setExtracted(null); }}
            className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
          >
            Re-scan
          </button>
        </div>
        <PurchaseForm initial={extractedToFormValue(extracted)} scanFile={file} />
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-2xl">
      <Link href="/purchases" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
        <span>&larr;</span> Back to Purchases
      </Link>
      <div>
        <p className="text-sm font-semibold text-brand-600">Scan to entry</p>
        <h1 className="page-title">Scan Purchase Invoice</h1>
        <p className="page-subtitle">
          Photograph the supplier invoice. The details are read automatically into an editable draft —
          always verify amounts against the paper before saving.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <label className="label">Invoice photo</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
        />
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Invoice preview" className="max-h-96 rounded-lg border border-slate-200 object-contain" />
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        <button onClick={runExtraction} disabled={!file || extracting} className="btn-primary w-full sm:w-auto disabled:opacity-50">
          {extracting ? "Reading invoice…" : "Extract details"}
        </button>
      </div>

      {extracted && (
        <div className="card p-5 space-y-4">
          <h2 className="label">Extracted summary</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><dt className="inline font-semibold">Supplier: </dt><dd className="inline">{extracted.supplier_name || "—"}</dd></div>
            <div><dt className="inline font-semibold">Invoice no.: </dt><dd className="inline">{extracted.doc_number || "—"}</dd></div>
            <div><dt className="inline font-semibold">Date: </dt><dd className="inline">{extracted.doc_date || "—"}</dd></div>
            <div><dt className="inline font-semibold">GSTIN: </dt><dd className="inline">{extracted.supplier_gst || "—"}</dd></div>
            <div><dt className="inline font-semibold">Tax: </dt><dd className="inline">{extracted.tax_type === "igst" ? `IGST ${extracted.tax_rate_percent}%` : extracted.tax_type === "none" ? "None" : `CGST+SGST ${extracted.tax_rate_percent}%`}</dd></div>
          </dl>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="p-1.5">Description</th>
                <th className="p-1.5">Thk</th>
                <th className="p-1.5">Qty (Mts)</th>
                <th className="p-1.5 text-right">Rate</th>
                <th className="p-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {extracted.items.map((it, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="p-1.5">{it.description}</td>
                  <td className="p-1.5">{it.thickness || "—"}</td>
                  <td className="p-1.5">{it.qty_mts}</td>
                  <td className="p-1.5 text-right">{it.rate}</td>
                  <td className="p-1.5 text-right font-mono">{(it.qty_mts * it.rate).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {extracted.charges.length > 0 && (
            <p className="text-xs text-slate-500">
              Charges found: {extracted.charges.map((c) => `${c.label} ₹${c.amount}`).join(", ")} — verify these on the paper.
            </p>
          )}
          <button onClick={() => setConfirmed(true)} className="btn-primary w-full sm:w-auto">
            Review &amp; edit full entry
          </button>
        </div>
      )}
    </div>
  );
}
