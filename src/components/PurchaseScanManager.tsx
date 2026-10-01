"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_UPLOAD_BYTES } from "@/lib/scanFile";
import { downscaleImage } from "@/lib/downscaleImage";

// View / replace the stored original scan for an existing purchase.
// Storage-only on purpose: re-running AI extraction here could clobber the
// verified entry, so fixing a wrong file = replace it, fixing wrong data =
// edit the form below.
export default function PurchaseScanManager({
  purchaseId,
  hasScan: initialHasScan,
}: {
  purchaseId: string;
  hasScan: boolean;
}) {
  const [hasScan, setHasScan] = useState(initialHasScan);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onPick(f: File | null) {
    if (!f || uploading) return;
    setError("");
    setNotice("");
    if (f.type === "application/pdf" && f.size > MAX_UPLOAD_BYTES) {
      setError(
        "This PDF is too large (max 4 MB). Try a smaller file or photograph the invoice."
      );
      return;
    }
    setUploading(true);
    try {
      const file = f.type.startsWith("image/") ? await downscaleImage(f) : f;
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/purchases/${purchaseId}/scan`, {
        method: "POST",
        body: fd,
      });
      let json: { error?: string } | null = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (!res.ok) {
        setError(
          json?.error ||
            (res.status === 413
              ? "This file is too large to upload (max 4 MB)."
              : "Could not store the scan. Please try again.")
        );
      } else {
        setHasScan(true);
        setNotice("Original scan saved.");
        router.refresh();
      }
    } catch {
      setError("Network error while uploading. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {hasScan && (
          <a
            href={`/api/purchases/${purchaseId}/scan`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-sm"
          >
            📷 Original scan
          </a>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-sm disabled:opacity-50"
        >
          {uploading ? "Uploading…" : hasScan ? "Replace scan" : "Attach scan"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          {notice}
        </p>
      )}
    </div>
  );
}
