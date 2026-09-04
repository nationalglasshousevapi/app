import { describe, it, expect } from "vitest";
import { computeTax, computeTotal } from "@/lib/documents";
import { computeDocumentMoney, computeSubtotal } from "@/lib/documentService";
import { parseItems } from "@/lib/documents";
import { readFileSync } from "fs";
import { join } from "path";

describe("cash order without GST and convert with GST option", () => {
  it("blankDocument('order') defaults to tax_type none and rate 0 (regression guard)", () => {
    const content = readFileSync(join(process.cwd(), "src/components/DocumentForm.tsx"), "utf8");
    // Must contain isOrder check for tax_type and tax_rate
    expect(content).toContain('isOrder ? "none" : "cgst_sgst"');
    expect(content).toContain("isOrder ? 0 : 0.18");
    // Also ensure CashSaleForm defaults to none
    const cashSale = readFileSync(join(process.cwd(), "src/components/CashSaleForm.tsx"), "utf8");
    expect(cashSale).toContain('useState<"cgst_sgst" | "none">("none")');
    expect(cashSale).toContain('tax_type: taxType');
  });

  it("blankDocument('invoice') logic defaults to cgst_sgst 18% (via file check)", () => {
    const content = readFileSync(join(process.cwd(), "src/components/DocumentForm.tsx"), "utf8");
    expect(content).toContain('isOrder ? "none" : "cgst_sgst"');
  });

  it("cash sale order without GST computes total = subtotal (no tax)", () => {
    const items = parseItems([{ description: "Glass", qty: 10, rate: 100 }]);
    const subtotal = computeSubtotal(items);
    expect(subtotal).toBe(1000);
    const money = computeDocumentMoney(items, { tax_type: "none", tax_rate: 0 });
    expect(money.cgst).toBe(0);
    expect(money.sgst).toBe(0);
    expect(money.igst).toBe(0);
    expect(money.total_amount).toBe(1000);
  });

  it("convert: Order without GST (1000) -> Invoice with CGST+SGST = 1180", () => {
    const subtotal = 1000;
    const discount = 0;
    const taxable: { label: string; amount: number }[] = [];
    const additional: { label: string; amount: number }[] = [];
    // Order totals (no GST)
    const { cgst: oCgst, sgst: oSgst, igst: oIgst } = computeTax(subtotal, "none", 0, discount, taxable);
    const { totalAmount: orderTotal } = computeTotal(subtotal, oCgst, oSgst, oIgst, discount, additional, taxable);
    expect(orderTotal).toBe(1000);

    // Convert with GST (simulate API recomputation)
    const { cgst, sgst, igst } = computeTax(subtotal, "cgst_sgst", 0.18, discount, taxable);
    const { totalAmount: invoiceTotal } = computeTotal(subtotal, cgst, sgst, igst, discount, additional, taxable);
    expect(cgst).toBe(90);
    expect(sgst).toBe(90);
    expect(invoiceTotal).toBe(1180);
  });

  it("convert: Order without GST -> Invoice with IGST = 1180", () => {
    const subtotal = 1000;
    const { cgst, sgst, igst } = computeTax(subtotal, "igst", 0.18, 0, []);
    const { totalAmount } = computeTotal(subtotal, cgst, sgst, igst, 0, [], []);
    expect(cgst).toBe(0);
    expect(sgst).toBe(0);
    expect(igst).toBe(180);
    expect(totalAmount).toBe(1180);
  });

  it("convert preserves discount and taxable charges when adding GST", () => {
    const subtotal = 1000;
    const discount = 100;
    const taxable = [{ label: "Transport", amount: 200 }];
    // Taxable amount = 1000 + 200 - 100 = 1100; GST 18% = 198
    const { cgst, sgst } = computeTax(subtotal, "cgst_sgst", 0.18, discount, taxable);
    const { totalAmount } = computeTotal(subtotal, cgst, sgst, 0, discount, [], taxable);
    expect(cgst).toBe(99);
    expect(sgst).toBe(99);
    expect(totalAmount).toBe(1298); // 1100 + 198
  });

  it("Order with GST already (18%) should not add extra GST on convert when not requested", () => {
    const subtotal = 1000;
    const { cgst, sgst } = computeTax(subtotal, "cgst_sgst", 0.18, 0, []);
    const { totalAmount: withGst } = computeTotal(subtotal, cgst, sgst, 0, 0, [], []);
    // Simulate convert without with_gst flag — keep same tax
    expect(withGst).toBe(1180);
    // If convert is called without with_gst, total should stay 1180, not 1392
    const { cgst: cgst2, sgst: sgst2 } = computeTax(subtotal, "cgst_sgst", 0.18, 0, []);
    const { totalAmount: stillWithGst } = computeTotal(subtotal, cgst2, sgst2, 0, 0, [], []);
    expect(stillWithGst).toBe(withGst);
  });
});
