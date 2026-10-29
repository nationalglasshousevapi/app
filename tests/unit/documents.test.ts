import { describe, it, expect } from "vitest";
import {
  parseItems,
  computeTax,
  computeTaxableChargesTotal,
  computeAdditionalChargesTotal,
  computeTotal,
  computeRoundOff,
  formatItemRows,
  totalGlassPieces,
  deriveGlassItemFields,
  roundUpInches,
} from "@/lib/documents";

describe("documents lib", () => {
  describe("parseItems", () => {
    it("parses item rows, defaulting optional fields", () => {
      const items = parseItems([
        { description: " 5mm Glass ", qty: 2, rate: 10 },
      ]);
      expect(items[0]).toMatchObject({
        description: "5mm Glass",
        qty: 2,
        rate: 10,
        size: "",
        hsn_code: "",
        unit: "sq.ft",
        nos: 1,
        item_type: "glass",
      });
    });

    it("detects charge items", () => {
      const items = parseItems([
        { description: "Transport", qty: 1, rate: 500, item_type: "charge" },
      ]);
      expect(items[0].item_type).toBe("charge");
    });

    it("coerces non-charge item_type to glass", () => {
      const items = parseItems([
        { description: "X", qty: 1, rate: 1, item_type: "weird" },
      ]);
      expect(items[0].item_type).toBe("glass");
    });
  });

  describe("computeTax", () => {
    it("computes CGST+SGST halves for intra-state", () => {
      const t = computeTax(1000, "cgst_sgst", 0.18);
      expect(t.cgst).toBe(90);
      expect(t.sgst).toBe(90);
      expect(t.igst).toBe(0);
    });

    it("computes full IGST for inter-state", () => {
      const t = computeTax(1000, "igst", 0.18);
      expect(t.igst).toBe(180);
      expect(t.cgst).toBe(0);
      expect(t.sgst).toBe(0);
    });

    it("returns zeros for tax_type none", () => {
      const t = computeTax(1000, "none", 0);
      expect(t).toEqual({ cgst: 0, sgst: 0, igst: 0 });
    });

    it("includes taxable charges and subtracts discount before tax", () => {
      const t = computeTax(1000, "cgst_sgst", 0.18, 100, [
        { label: "Transport", amount: 200 },
      ]);
      // taxable = 1000 + 200 - 100 = 1100 → 9% = 99
      expect(t.cgst).toBe(99);
      expect(t.sgst).toBe(99);
    });
  });

  describe("deriveGlassItemFields", () => {
    it("derives calc dimensions and sq.ft qty from actual inches and nos", () => {
      const d = deriveGlassItemFields({
        actual_length: 21.5,
        actual_width: 32,
        nos: 2,
        unit: "sq.ft",
      });
      expect(d.calculated_length).toBe(24);
      expect(d.calculated_width).toBe(36);
      expect(d.size).toBe("24x36");
      // 24 * 36 = 864 sq in; * 2 / 144 = 12
      expect(d.qty).toBe(12);
    });

    it("uses nos as qty for nos unit and rounds running feet", () => {
      expect(
        deriveGlassItemFields({
          actual_length: 24,
          actual_width: 24,
          nos: 3,
          unit: "nos",
        }).qty
      ).toBe(3);

      const rn = deriveGlassItemFields({
        actual_length: 24,
        actual_width: 24,
        nos: 2,
        unit: "rn ft",
      });
      // perimeter = (48 + 48) / 12 = 8 ft per piece
      expect(rn.qty).toBe(16);
    });

    it("rounds up inches by 3 under 24 and by 6 at or above 24", () => {
      expect(roundUpInches(21.5)).toBe(24);
      expect(roundUpInches(24)).toBe(24);
      expect(roundUpInches(25)).toBe(30);
      expect(roundUpInches(0)).toBe(0);
    });
  });

  describe("totalGlassPieces", () => {
    it("sums nos across glass items and ignores charges", () => {
      expect(
        totalGlassPieces([
          { item_type: "glass", nos: 2 },
          { item_type: "glass", nos: 2 },
          { item_type: "charge", nos: 9 },
        ])
      ).toBe(4);
    });

    it("treats missing nos as zero", () => {
      expect(totalGlassPieces([{ item_type: "glass", nos: null }])).toBe(0);
    });
  });

  describe("computeTaxableChargesTotal / computeAdditionalChargesTotal", () => {
    it("sums charge amounts, ignoring missing/zero", () => {
      expect(
        computeTaxableChargesTotal([
          { label: "A", amount: 100 },
          { label: "B", amount: 50 },
        ])
      ).toBe(150);
      expect(
        computeTaxableChargesTotal([
          { label: "A", amount: 0 },
          { label: "B", amount: undefined as any },
        ])
      ).toBe(0);
      expect(computeAdditionalChargesTotal([{ label: "A", amount: 10 }])).toBe(
        10
      );
    });
  });

  describe("computeTotal + computeRoundOff", () => {
    it("adds tax and additional charges, rounds to nearest integer", () => {
      const { totalAmount, roundOff } = computeTotal(1000, 90, 90, 0, 0, [
        { label: "Polish", amount: 25.4 },
      ]);
      // raw = 1000 + 180 + 25.4 = 1205.4 → round 1205, roundOff -0.4
      expect(totalAmount).toBe(1205);
      expect(roundOff).toBeCloseTo(-0.4);
    });

    it("rounds up when fractional part >= 0.5", () => {
      const { totalAmount, roundOff } = computeTotal(1000.5, 0, 0, 0);
      expect(totalAmount).toBe(1001);
      expect(roundOff).toBeCloseTo(0.5);
    });

    it("applies discount before tax in the total", () => {
      const { totalAmount } = computeTotal(
        1000,
        81,
        81,
        0,
        100,
        [],
        [{ label: "T", amount: 0 }]
      );
      // taxable = 900 → 81+81 → 1062
      expect(totalAmount).toBe(1062);
    });

    it("computeRoundOff returns negative when rounding down", () => {
      expect(computeRoundOff(1205.4)).toBeCloseTo(-0.4);
      expect(computeRoundOff(1205.5)).toBeCloseTo(0.5);
    });
  });

  describe("formatItemRows", () => {
    it("computes total = qty * rate rounded to 2dp and sets position", () => {
      const rows = formatItemRows(
        [
          {
            description: "A",
            size: "2x2",
            hsn_code: "7005",
            qty: 3,
            unit: "sq.ft",
            rate: 10,
            actual_length: 24,
            actual_width: 24,
            nos: 1,
            calculated_length: 24,
            calculated_width: 24,
            item_type: "glass",
            thickness: 6,
            width_mm: 183,
            length_mm: 244,
            pcs: 26,
          },
        ],
        "doc-1"
      );
      expect(rows[0]).toMatchObject({
        document_id: "doc-1",
        position: 0,
        description: "A",
        qty: 3,
        rate: 10,
        total: 30,
        item_type: "glass",
      });
    });
  });
});
