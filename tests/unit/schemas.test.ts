import { describe, it, expect } from "vitest";
import { createPaymentSchema, createCustomerSchema } from "@/lib/schemas";

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
