import { describe, it, expect, vi, afterEach } from "vitest";
import { extractPurchaseInvoice } from "@/lib/ocr";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const EXTRACTION = {
  supplier_name: "Acme Glass",
  doc_number: "INV-1",
  items: [
    {
      description: "Toughened glass",
      hsn_code: "7005",
      thickness: 6,
      width_mm: 0,
      length_mm: 0,
      pcs: 1,
      qty_mts: 10,
      rate: 100,
      amount: 1000,
    },
  ],
};

function successResponse(): Response {
  return jsonResponse(200, {
    choices: [{ message: { content: JSON.stringify(EXTRACTION) } }],
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OCR_API_KEY;
  delete process.env.OCR_MODEL;
  delete process.env.OCR_FALLBACK_MODEL;
});

describe("extractPurchaseInvoice fallback", () => {
  it("tries OCR_FALLBACK_MODEL once when the primary returns 503", async () => {
    process.env.OCR_API_KEY = "test-key";
    process.env.OCR_MODEL = "primary-model";
    process.env.OCR_FALLBACK_MODEL = "fallback-model";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(503, {
          error: { code: 503, message: "high demand", status: "UNAVAILABLE" },
        })
      )
      .mockResolvedValueOnce(successResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractPurchaseInvoice("aGVsbG8=", "image/jpeg");

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe(
      "primary-model"
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe(
      "fallback-model"
    );
  });

  it("returns a friendly busy message when every model is overloaded", async () => {
    process.env.OCR_API_KEY = "test-key";
    process.env.OCR_MODEL = "primary-model";
    process.env.OCR_FALLBACK_MODEL = "fallback-model";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(503, {
        error: { code: 503, message: "high demand", status: "UNAVAILABLE" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractPurchaseInvoice("aGVsbG8=", "image/jpeg");

    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining("busy"),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry auth failures with the fallback model", async () => {
    process.env.OCR_API_KEY = "bad-key";
    process.env.OCR_MODEL = "primary-model";
    process.env.OCR_FALLBACK_MODEL = "fallback-model";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: "bad key" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractPurchaseInvoice("aGVsbG8=", "image/jpeg");

    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
