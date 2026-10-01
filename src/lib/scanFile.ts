// Shared rules for invoice scan uploads: photos and PDFs.
// Used by /api/purchases/extract (AI extraction) and /api/purchases/[id]/scan
// (storing the original document), so both accept exactly the same formats.

export const MAX_SCAN_BYTES = 10 * 1024 * 1024;

// Vercel rejects request bodies over 4.5 MB with an opaque 413, so the browser
// refuses larger PDFs up front. Photos are downscaled before upload anyway.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const SCAN_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export type ScanFileCheck =
  | { ok: true; mime: string; ext: string }
  | { ok: false; status: number; error: string };

export function checkScanFile(
  mime: string | undefined,
  size: number
): ScanFileCheck {
  if (size > MAX_SCAN_BYTES) {
    return { ok: false, status: 413, error: "File is too large (max 10 MB)." };
  }
  // Some Android camera intents report an empty type for JPEG photos.
  const resolved = (mime || "image/jpeg").toLowerCase();
  const ext = SCAN_MIME_EXT[resolved];
  if (!ext) {
    return {
      ok: false,
      status: 415,
      error: "Please upload the invoice as a photo (JPG, PNG, WebP) or a PDF.",
    };
  }
  return { ok: true, mime: resolved, ext };
}

// Magic-byte sniffing: File.type comes from the client and can't be trusted,
// so peek at the content before forwarding bytes to the vision API or storage.
// Returns false for empty, truncated, or mislabelled files.
export function scanMagicOk(bytes: Uint8Array, mime: string): boolean {
  if (bytes.length < 12) return false;
  switch (mime) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      );
    case "image/webp":
      return (
        bytes[0] === 0x52 && // R
        bytes[1] === 0x49 && // I
        bytes[2] === 0x46 && // F
        bytes[3] === 0x46 && // F
        bytes[8] === 0x57 && // W
        bytes[9] === 0x45 && // E
        bytes[10] === 0x42 && // B
        bytes[11] === 0x50 // P
      );
    case "image/heic":
    case "image/heif":
      // ISO BMFF: 4-byte box size, then "ftyp".
      return (
        bytes[4] === 0x66 && // f
        bytes[5] === 0x74 && // t
        bytes[6] === 0x79 && // y
        bytes[7] === 0x70 // p
      );
    case "application/pdf":
      return (
        bytes[0] === 0x25 && // %
        bytes[1] === 0x50 && // P
        bytes[2] === 0x44 && // D
        bytes[3] === 0x46 // F
      );
    default:
      return false;
  }
}
