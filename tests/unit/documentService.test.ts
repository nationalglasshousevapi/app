import { describe, it, expect } from "vitest";
import {
  DocumentServiceError,
  buildCopiedItemRows,
  computeDocumentMoney,
  computeSubtotal,
  formatDocNumber,
} from "@/lib/documentService";
import { parseItems } from "@/lib/documents";

describe("documentService pure helpers", () => {
  describe("formatDocNumber", () => {
    it("builds CODE-FY-SEQ numbers padded to 4 digits", () => {
      expect(formatDocNumber("invoice", "24-25", 71)).toBe("INV-24-25-0071");
      expect(formatDocNumber("purchase", "25-26", 12)).toBe("PUR-25-26-0012");
    });

    it("pads sequence beyond 4 digits without truncation", () => {
      expect(formatDocNumber("quotation", "24-25", 12345)).toBe("QTN-24-25-12345");
    });

    it("falls back to DOC prefix for unknown types", () => {
      expect(formatDocNumber("mystery", "24-25", 1)).toBe("DOC-24-25-0001");
    });
  });

  describe("computeSubtotal", () => {
    it("sums qty * rate across items", () => {
      const items = parseItems([
        { description: "A", qty: 2, rate: 10 },
        { description: "B", qty: 3, rate: 5.5 },
      ]);
      expect(computeSubtotal(items)).toBeCloseTo(36.5);
    });

    it("treats missing qty/rate as zero", () => {
      const items = parseItems([{ description: "A", qty: Number.NaN, rate: Number.NaN }]);
      expect(computeSubtotal(items)).toBe(0);
    });
  });

  describe("computeDocumentMoney", () => {
    it("computes CGST+SGST split with round-off for intra-state", () => {
      const items = parseItems([{ description: "Glass", qty: 10, rate: 100 }]);
      const money = computeDocumentMoney(items, { tax_type: "cgst_sgst", tax_rate: 0.18 });
      expect(money).toEqual({
        subtotal: 1000,
        cgst: 90,
        sgst: 90,
        igst: 0,
        round_off: 0,
        total_amount: 1180,
      });
    });

    it("computes IGST for inter-state", () => {
      const items = parseItems([{ description: "Glass", qty: 1, rate: 1000 }]);
      const money = computeDocumentMoney(items, { tax_type: "igst", tax_rate: 0.18 });
      expect(money.cgst).toBe(0);
      expect(money.sgst).toBe(0);
      expect(money.igst).toBe(180);
      expect(money.total_amount).toBe(1180);
    });

    it("subtracts discount before tax", () => {
      const items = parseItems([{ description: "Glass", qty: 1, rate: 1000 }]);
      const money = computeDocumentMoney(items, {
        tax_type: "cgst_sgst",
        tax_rate: 0.18,
        discount_amount: 100,
      });
      expect(money.cgst).toBe(81);
      expect(money.sgst).toBe(81);
      expect(money.total_amount).toBe(1062);
    });

    it("includes taxable charges in tax base but not additional charges", () => {
      const items = parseItems([{ description: "Glass", qty: 1, rate: 1000 }]);
      const money = computeDocumentMoney(items, {
        tax_type: "cgst_sgst",
        tax_rate: 0.18,
        taxable_charges: [{ label: "Transport", amount: 200 }],
        additional_charges: [{ label: "Polish", amount: 25.4 }],
      });
      expect(money.cgst).toBe(108);
      expect(money.sgst).toBe(108);
      expect(money.round_off).toBeCloseTo(-0.4);
      expect(money.total_amount).toBe(1441);
    });

    it("defaults to no tax when options are omitted", () => {
      const items = parseItems([{ description: "Glass", qty: 2, rate: 50 }]);
      expect(computeDocumentMoney(items)).toEqual({
        subtotal: 100,
        cgst: 0,
        sgst: 0,
        igst: 0,
        round_off: 0,
        total_amount: 100,
      });
    });
  });

  describe("buildCopiedItemRows", () => {
    it("assigns document_id and sequential positions, defaulting dimensions", () => {
      const rows = buildCopiedItemRows(
        [
          { description: "A", size: null, hsn_code: "7005", qty: 2, unit: "sq.ft", rate: 10, total: 20 },
          { description: "B", size: "x", hsn_code: null, qty: 1, unit: "sq.ft", rate: 5, total: 5, nos: 3 },
        ],
        "doc-9",
      );
      expect(rows[0]).toMatchObject({
        document_id: "doc-9",
        position: 0,
        description: "A",
        total: 20,
        actual_length: 0,
        actual_width: 0,
        nos: 1,
      });
      expect(rows[1]).toMatchObject({ position: 1, nos: 3 });
    });

    it("preserves original totals instead of recomputing", () => {
      const rows = buildCopiedItemRows(
        [{ description: "A", size: null, hsn_code: null, qty: 2, unit: "sq.ft", rate: 10, total: 19.99 }],
        "doc-1",
      );
      expect(rows[0].total).toBe(19.99);
    });
  });

  describe("DocumentServiceError", () => {
    it("is an Error carrying the message", () => {
      const err = new DocumentServiceError("boom");
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("boom");
      expect(err.name).toBe("DocumentServiceError");
    });
  });
});
