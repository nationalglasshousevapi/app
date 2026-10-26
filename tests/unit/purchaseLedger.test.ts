import { describe, it, expect } from "vitest";
import { purchasePaymentSummary } from "@/lib/purchasePayments";
import { supplierLedgerRows, supplierShareKey } from "@/lib/supplierLedger";
import { supplierLedgerShareMessage } from "@/lib/whatsapp";

describe("purchasePaymentSummary", () => {
  it("subtracts recorded payments from the purchase total", () => {
    const result = purchasePaymentSummary("1000.50", [
      { amount: "400.25" },
      { amount: 100 },
    ]);
    expect(result.total).toBe(1000.5);
    expect(result.totalPaid).toBe(500.25);
    expect(result.balance).toBe(500.25);
    expect(result.isPaid).toBe(false);
  });

  it("reports an overpaid balance as paid", () => {
    const result = purchasePaymentSummary(1000, [{ amount: 1200 }]);
    expect(result.balance).toBe(-200);
    expect(result.isPaid).toBe(true);
  });
});

describe("supplierLedgerRows", () => {
  const purchase = {
    id: "p1",
    doc_date: "2026-01-05",
    doc_number: "PUR-1",
    total_amount: "1000.00",
  };
  const payment = {
    id: "pay1",
    document_id: "p1",
    payment_date: "2026-01-06",
    amount: "400.00",
    payment_mode: "cash",
    reference_number: null,
  };

  it("tracks purchases and payments as a running balance", () => {
    const result = supplierLedgerRows([purchase], [payment]);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      type: "invoice",
      debit: 1000,
      credit: 0,
      balance: 1000,
    });
    expect(result.entries[1]).toMatchObject({
      type: "payment",
      debit: 0,
      credit: 400,
      balance: 600,
    });
    expect(result.totalPurchased).toBe(1000);
    expect(result.totalPaid).toBe(400);
    expect(result.balancePayable).toBe(600);
  });

  it("puts a same-day purchase before its payment", () => {
    const result = supplierLedgerRows(
      [purchase],
      [{ ...payment, payment_date: purchase.doc_date }]
    );
    expect(result.entries.map((entry) => entry.type)).toEqual([
      "invoice",
      "payment",
    ]);
  });

  it("reports an advance as a negative balance", () => {
    const result = supplierLedgerRows(
      [purchase],
      [{ ...payment, amount: "1500.00" }]
    );
    expect(result.balancePayable).toBe(-500);
  });
});

describe("supplier sharing", () => {
  it("keys tokens by supplier name", () => {
    expect(supplierShareKey("  Glass Traders  ")).toBe(
      "supplier:Glass Traders"
    );
  });

  it("formats the WhatsApp message with totals", () => {
    const message = supplierLedgerShareMessage({
      supplierName: "Glass Traders",
      totalPurchased: 123456.78,
      totalPaid: 100000,
      balancePayable: 23456.78,
      pdfUrl: "https://app.example/pdf",
    });
    expect(message).toContain("Dear Glass Traders");
    expect(message).toContain("Purchases: ₹ 1,23,456.78");
    expect(message).toContain("Paid: ₹ 1,00,000");
    expect(message).toContain("Balance payable: ₹ 23,456.78");
    expect(message).toContain("https://app.example/pdf");
  });
});
