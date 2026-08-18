import { test, expect, type APIRequestContext } from "@playwright/test";
import { api, createTestCustomer, createTestQuotation, cleanupTestData, sb, TEST_PREFIX } from "./helpers";

test.describe("Convert to Invoice API", () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await api();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("converts a quotation into a draft invoice, linking via order_number", async () => {
    const { document: quote, billToName } = await createTestQuotation();

    const res = await ctx.post("/api/documents/convert", { data: { id: quote.id } });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();

    expect(json.document.doc_type).toBe("invoice");
    expect(json.document.doc_number).toMatch(/^INV-\d{2}-\d{2}-\d{4}$/);
    expect(json.document.order_number).toBe(quote.doc_number); // back-link
    expect(json.document.bill_to_name).toBe(billToName);
    expect(json.document.status).toBe("draft"); // no payment → credit
    expect(json.document.items).toBeUndefined();

    // Source is marked converted
    const { data: source } = await sb().from("documents").select("status").eq("id", quote.id).single();
    expect(source?.status).toBe("converted");

    // Line items copied
    const { data: items } = await sb().from("document_items").select("description").eq("document_id", json.document.id);
    expect(items?.length).toBe(1);
    expect(items?.[0].description).toContain(TEST_PREFIX);
  });

  test("convert with record_payment creates a paid invoice + payment + receipt", async () => {
    const customer = await createTestCustomer();
    const { document: quote } = await createTestQuotation({ customerId: customer.id });

    const res = await ctx.post("/api/documents/convert", {
      data: { id: quote.id, record_payment: true, payment_mode: "cash" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();

    expect(json.document.status).toBe("paid");
    expect(json.payment).toBeTruthy();
    expect(json.payment.payment_mode).toBe("cash");
    expect(Number(json.payment.amount)).toBe(Number(quote.total_amount));

    // A receipt doc should exist linked to the payment
    const { data: receipt } = await sb()
      .from("documents")
      .select("id, doc_type, status, total_amount")
      .eq("id", json.payment.document_id)
      .single();
    expect(receipt?.doc_type).toBe("receipt");
    expect(receipt?.status).toBe("paid");
    expect(Number(receipt?.total_amount)).toBe(Number(quote.total_amount));

    // Ledger impact: payment exists for the customer
    const { data: payments } = await sb().from("payments").select("id").eq("customer_id", customer.id);
    expect(payments?.length).toBeGreaterThan(0);
  });

  test("auto-creates a customer when converting with payment but no customer_id", async () => {
    const { document: quote } = await createTestQuotation({ customerId: null });

    const res = await ctx.post("/api/documents/convert", {
      data: { id: quote.id, record_payment: true, payment_mode: "upi" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();

    expect(json.document.customer_id).toBeTruthy();
    const { data: customer } = await sb().from("customers").select("name").eq("id", json.document.customer_id).single();
    expect(customer?.name).toBe(quote.bill_to_name);
  });

  test("rejects converting an invoice (not a convertible type)", async () => {
    // create an invoice directly via API
    const res = await ctx.post("/api/documents", {
      data: {
        doc_type: "invoice",
        doc_date: new Date().toISOString().slice(0, 10),
        bill_to_name: `${TEST_PREFIX} Invoice ${Date.now()}`,
        tax_type: "cgst_sgst",
        tax_rate: 0.18,
        status: "draft",
        items: [{ description: `${TEST_PREFIX} x`, qty: 1, rate: 10 }],
      },
    });
    const { document: invoice } = await res.json();

    const convertRes = await ctx.post("/api/documents/convert", { data: { id: invoice.id } });
    expect(convertRes.status()).toBe(400);
    const body = await convertRes.json();
    expect(body.error).toContain("cannot be converted");
  });

  test("rejects converting an already-converted document", async () => {
    const { document: quote } = await createTestQuotation();
    await ctx.post("/api/documents/convert", { data: { id: quote.id } });

    const second = await ctx.post("/api/documents/convert", { data: { id: quote.id } });
    expect(second.status()).toBe(400);
    expect((await second.json()).error).toContain("already been converted");
  });

  test("rejects converting a cancelled document", async () => {
    const { document: quote } = await createTestQuotation();
    await ctx.patch(`/api/documents/${quote.id}/status`, { data: { status: "cancelled" } });

    const res = await ctx.post("/api/documents/convert", { data: { id: quote.id } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toContain("Cancelled");
  });

  test("rejects an invalid payment mode", async () => {
    const { document: quote } = await createTestQuotation();
    const res = await ctx.post("/api/documents/convert", {
      data: { id: quote.id, record_payment: true, payment_mode: "bitcoin" },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toContain("Invalid payment mode");
  });

  test("rejects a missing document id", async () => {
    const res = await ctx.post("/api/documents/convert", { data: {} });
    expect(res.status()).toBe(400);
  });
});
