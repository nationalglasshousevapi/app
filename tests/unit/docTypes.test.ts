import { describe, it, expect } from "vitest";
import {
  DOC_TYPES,
  docTypeLabel,
  docTypeShort,
  financialYearFor,
  canConvertToInvoice,
  CONVERTIBLE_TYPES,
} from "@/lib/docTypes";

describe("docTypes", () => {
  it("includes purchase in DOC_TYPES with PUR short code", () => {
    const purchase = DOC_TYPES.find((d) => d.value === "purchase");
    expect(purchase).toBeDefined();
    expect(purchase?.label).toBe("Purchase");
    expect(purchase?.short).toBe("PUR");
  });

  it("includes all 6 document types", () => {
    expect(DOC_TYPES.map((d) => d.value).sort()).toEqual([
      "estimate",
      "invoice",
      "performa_invoice",
      "purchase",
      "quotation",
      "receipt",
    ]);
  });

  it("docTypeLabel returns the label for known types and raw string for unknown", () => {
    expect(docTypeLabel("purchase")).toBe("Purchase");
    expect(docTypeLabel("invoice")).toBe("Invoice");
    expect(docTypeLabel("made_up_type")).toBe("made_up_type");
  });

  it("docTypeShort returns short code for known types and DOC fallback", () => {
    expect(docTypeShort("purchase")).toBe("PUR");
    expect(docTypeShort("receipt")).toBe("RCP");
    expect(docTypeShort("made_up_type")).toBe("DOC");
  });

  describe("financialYearFor", () => {
    it("returns the same financial year for April (start of FY)", () => {
      expect(financialYearFor(new Date(2025, 3, 1))).toBe("25-26"); // 1 Apr 2025
    });

    it("returns the previous fiscal year for March (end of FY)", () => {
      expect(financialYearFor(new Date(2025, 2, 31))).toBe("24-25"); // 31 Mar 2025
    });

    it("handles the December-to-January year boundary", () => {
      expect(financialYearFor(new Date(2025, 11, 31))).toBe("25-26"); // 31 Dec 2025
      expect(financialYearFor(new Date(2026, 0, 1))).toBe("25-26"); // 1 Jan 2026
    });

    it("handles April exactly at month start", () => {
      expect(financialYearFor(new Date(2024, 3, 1))).toBe("24-25");
    });
  });

  describe("canConvertToInvoice", () => {
    it("returns true for quotation, performa_invoice, estimate", () => {
      expect(CONVERTIBLE_TYPES).toEqual(["quotation", "performa_invoice", "estimate"]);
      expect(canConvertToInvoice("quotation")).toBe(true);
      expect(canConvertToInvoice("performa_invoice")).toBe(true);
      expect(canConvertToInvoice("estimate")).toBe(true);
    });

    it("returns false for invoice, receipt, purchase, and unknown types", () => {
      expect(canConvertToInvoice("invoice")).toBe(false);
      expect(canConvertToInvoice("receipt")).toBe(false);
      expect(canConvertToInvoice("purchase")).toBe(false);
      expect(canConvertToInvoice("made_up_type")).toBe(false);
    });
  });
});
