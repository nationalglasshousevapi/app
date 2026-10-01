import { describe, it, expect } from "vitest";
import {
  checkScanFile,
  MAX_SCAN_BYTES,
  SCAN_MIME_EXT,
  scanMagicOk,
} from "@/lib/scanFile";

describe("checkScanFile", () => {
  it("accepts photos and PDFs and maps them to storage extensions", () => {
    expect(checkScanFile("application/pdf", 1024)).toEqual({
      ok: true,
      mime: "application/pdf",
      ext: "pdf",
    });
    expect(checkScanFile("image/jpeg", 1024)).toEqual({
      ok: true,
      mime: "image/jpeg",
      ext: "jpg",
    });
    expect(checkScanFile("image/png", 1024)).toEqual({
      ok: true,
      mime: "image/png",
      ext: "png",
    });
    expect(checkScanFile("image/webp", 1024)).toEqual({
      ok: true,
      mime: "image/webp",
      ext: "webp",
    });
    expect(checkScanFile("image/heic", 1024)).toEqual({
      ok: true,
      mime: "image/heic",
      ext: "heic",
    });
    expect(checkScanFile("image/heif", 1024)).toEqual({
      ok: true,
      mime: "image/heif",
      ext: "heif",
    });
  });

  it("lowercases the reported mime type", () => {
    expect(checkScanFile("APPLICATION/PDF", 10)).toEqual({
      ok: true,
      mime: "application/pdf",
      ext: "pdf",
    });
  });

  it("falls back to JPEG when the browser reports no mime type", () => {
    expect(checkScanFile(undefined, 10)).toEqual({
      ok: true,
      mime: "image/jpeg",
      ext: "jpg",
    });
    expect(checkScanFile("", 10)).toEqual({
      ok: true,
      mime: "image/jpeg",
      ext: "jpg",
    });
  });

  it("rejects unsupported file types with 415", () => {
    expect(checkScanFile("application/msword", 10)).toMatchObject({
      ok: false,
      status: 415,
    });
    expect(checkScanFile("text/plain", 10)).toMatchObject({
      ok: false,
      status: 415,
    });
  });

  it("rejects files over the size limit with 413", () => {
    expect(checkScanFile("application/pdf", MAX_SCAN_BYTES + 1)).toMatchObject({
      ok: false,
      status: 413,
    });
    expect(checkScanFile("application/pdf", MAX_SCAN_BYTES)).toMatchObject({
      ok: true,
    });
  });

  it("maps every accepted mime type to a unique extension", () => {
    const exts = Object.values(SCAN_MIME_EXT);
    expect(new Set(exts).size).toBe(exts.length);
  });
});

describe("scanMagicOk", () => {
  it("accepts genuine JPEG, PNG, WebP, HEIC and PDF headers", () => {
    expect(
      scanMagicOk(
        new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]),
        "image/jpeg"
      )
    ).toBe(true);
    expect(
      scanMagicOk(
        new Uint8Array([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
        ]),
        "image/png"
      )
    ).toBe(true);
    // RIFF....WEBP
    expect(
      scanMagicOk(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
        "image/webp"
      )
    ).toBe(true);
    // ....ftyp
    expect(
      scanMagicOk(
        new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0]),
        "image/heic"
      )
    ).toBe(true);
    expect(
      scanMagicOk(
        new Uint8Array([
          0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0,
        ]),
        "application/pdf"
      )
    ).toBe(true);
  });

  it("rejects mislabelled, truncated and unknown content", () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    expect(scanMagicOk(png, "image/jpeg")).toBe(false);
    expect(scanMagicOk(png, "application/pdf")).toBe(false);
    expect(scanMagicOk(new Uint8Array([0x25, 0x50]), "application/pdf")).toBe(
      false
    );
    expect(scanMagicOk(new Uint8Array(12), "image/jpeg")).toBe(false);
    expect(scanMagicOk(png, "application/msword")).toBe(false);
  });
});
