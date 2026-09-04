import { describe, it, expect } from "vitest";
import {
  createPaymentSchema,
  createCustomerSchema,
  createCashSaleSchema,
  createExpenseSchema,
} from "@/lib/schemas";

describe("createPaymentSchema", () => {
  const validPayment = {
    amount: 500,
  };

  it("accepts a minimal valid payload", () => {
    const parsed = createPaymentSchema.safeParse(validPayment);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(500);
      expect(parsed.data.payment_mode).toBe("cash");
      expect(parsed.data.generate_receipt).toBe(false);
    }
  });

  it("rejects a negative amount", () => {
    const parsed = createPaymentSchema.safeParse({ ...validPayment, amount: -100 });
    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid payment_mode", () => {
    const parsed = createPaymentSchema.safeParse({
      ...validPayment,
      payment_mode: "bitcoin",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a malformed customer_id uuid", () => {
    const parsed = createPaymentSchema.safeParse({
      ...validPayment,
      customer_id: "not-a-uuid",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a valid customer_id uuid", () => {
    const parsed = createPaymentSchema.safeParse({
      ...validPayment,
      customer_id: "123e4567-e89b-42d3-a456-426614174000",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a null reference_number (blank ref field)", () => {
    const parsed = createPaymentSchema.safeParse({
      ...validPayment,
      payment_mode: "bank_transfer",
      reference_number: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // null is accepted and stays null (API normalizes null/"" -> null in DB)
      expect(parsed.data.reference_number).toBeNull();
    }
  });

  it("accepts an omitted reference_number", () => {
    const parsed = createPaymentSchema.safeParse({
      ...validPayment,
      payment_mode: "upi",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("createCustomerSchema", () => {
  it("requires a name", () => {
    const parsed = createCustomerSchema.safeParse({ address: "Vapi" });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const parsed = createCustomerSchema.safeParse({ name: "" });
    expect(parsed.success).toBe(false);
  });

  it("accepts a minimal payload with just a name", () => {
    const parsed = createCustomerSchema.safeParse({ name: "Sharma Glass Traders" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.opening_balance).toBe(0);
    }
  });
});

describe("createCashSaleSchema — cash order without GST by default", () => {
  const validCashSale = {
    customer_name: "Ramesh",
    items: [{ description: "5 mm Clear Glass", qty: 10, rate: 100 }],
  };

  it("defaults to tax_type none (no GST) for counter orders", () => {
    const parsed = createCashSaleSchema.safeParse(validCashSale);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tax_type).toBe("none");
    }
  });

  it("accepts explicit cgst_sgst when GST is needed", () => {
    const parsed = createCashSaleSchema.safeParse({ ...validCashSale, tax_type: "cgst_sgst" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.tax_type).toBe("cgst_sgst");
  });

  it("accepts null reference_number (blank ref field)", () => {
    const parsed = createCashSaleSchema.safeParse({
      ...validCashSale,
      payment_mode: "bank_transfer",
      reference_number: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts omitted reference_number", () => {
    const parsed = createCashSaleSchema.safeParse({ ...validCashSale, payment_mode: "upi" });
    expect(parsed.success).toBe(true);
  });

  it("accepts empty string reference_number", () => {
    const parsed = createCashSaleSchema.safeParse({ ...validCashSale, reference_number: "" });
    expect(parsed.success).toBe(true);
  });
});

describe("createExpenseSchema — reference_number optional", () => {
  it("accepts null reference_number", () => {
    const parsed = createExpenseSchema.safeParse({ amount: 100, reference_number: null });
    expect(parsed.success).toBe(true);
  });
  it("accepts omitted reference_number", () => {
    const parsed = createExpenseSchema.safeParse({ amount: 100 });
    expect(parsed.success).toBe(true);
  });
});
