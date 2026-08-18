import { test, expect, type APIRequestContext } from "@playwright/test";
import { api, cleanupTestData, TEST_PREFIX } from "./helpers";

test.describe("Purchases API", () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await api();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  async function createPurchase(opts: { status?: string; supplier?: string } = {}) {
    const res = await ctx.post("/api/purchases", {
      data: {
        doc_type: "purchase",
        doc_date: new Date().toISOString().slice(0, 10),
        bill_to_name: opts.supplier ?? `${TEST_PREFIX} Supplier ${Date.now()}`,
        bill_to_gst: "24AAAAA0000A1Z5",
        tax_type: "cgst_sgst",
        tax_rate: 0.18,
        status: opts.status ?? "draft",
        items: [
          {
            description: `${TEST_PREFIX} 5mm glass`,
            size: "72x96",
            hsn_code: "7005",
            qty: 10,
            unit: "sq.ft",
            rate: 25,
          },
          {
            description: `${TEST_PREFIX} packing`,
            size: "",
            hsn_code: "7005",
            qty: 1,
            unit: "nos",
            rate: 100,
          },
        ],
      },
    });
    const json = await res.json();
    if (!res.ok()) throw new Error(`createPurchase failed (${res.status()}): ${JSON.stringify(json)}`);
    return json.document;
  }

  test("creates a purchase with a PUR number and computed totals", async () => {
    const doc = await createPurchase();
    expect(doc.doc_type).toBe("purchase");
    expect(doc.doc_number).toMatch(/^PUR-\d{2}-\d{2}-\d{4}$/);
    // subtotal = 10*25 + 1*100 = 350; cgst 18%/2 → 31.5 each; total = 413
    expect(Number(doc.subtotal)).toBe(350);
    expect(Number(doc.total_amount)).toBe(413);
    expect(doc.status).toBe("draft");
  });

  test("lists purchases and supports search", async () => {
    const doc = await createPurchase({ supplier: `${TEST_PREFIX} Alpha ${Date.now()}` });
    const res = await ctx.get("/api/purchases");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.purchases.length).toBeGreaterThan(0);
    expect(json.purchases.some((p: any) => p.id === doc.id)).toBe(true);

    const search = await ctx.get(`/api/purchases?q=${encodeURIComponent(doc.doc_number)}`);
    const sJson = await search.json();
    expect(sJson.purchases.some((p: any) => p.id === doc.id)).toBe(true);
  });

  test("gets a single purchase with items", async () => {
    const doc = await createPurchase();
    const res = await ctx.get(`/api/purchases/${doc.id}`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.document.id).toBe(doc.id);
    expect(json.items.length).toBe(2);
  });

  test("updates a purchase and replaces items", async () => {
    const doc = await createPurchase();
    const res = await ctx.put(`/api/purchases/${doc.id}`, {
      data: {
        doc_date: new Date().toISOString().slice(0, 10),
        bill_to_name: doc.bill_to_name,
        tax_type: "none",
        tax_rate: 0,
        status: "paid",
        items: [
          { description: `${TEST_PREFIX} only item`, size: "", hsn_code: "7005", qty: 5, unit: "nos", rate: 20 },
        ],
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.document.status).toBe("paid");
    expect(Number(json.document.subtotal)).toBe(100);
    expect(Number(json.document.total_amount)).toBe(100);

    const { data: items } = await (await import("./helpers")).sb()
      .from("document_items")
      .select("description")
      .eq("document_id", doc.id);
    expect(items?.length).toBe(1);
  });

  test("rejects a purchase with no items", async () => {
    const res = await ctx.post("/api/purchases", {
      data: {
        doc_type: "purchase",
        doc_date: new Date().toISOString().slice(0, 10),
        bill_to_name: `${TEST_PREFIX} Empty`,
        tax_type: "none",
        tax_rate: 0,
        status: "draft",
        items: [],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects a non-purchase doc_type", async () => {
    const res = await ctx.post("/api/purchases", {
      data: {
        doc_type: "invoice",
        doc_date: new Date().toISOString().slice(0, 10),
        bill_to_name: `${TEST_PREFIX} Wrong`,
        tax_type: "none",
        tax_rate: 0,
        status: "draft",
        items: [{ description: "x", qty: 1, rate: 1 }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("deletes a purchase", async () => {
    const doc = await createPurchase();
    const res = await ctx.delete(`/api/purchases/${doc.id}`);
    expect(res.ok()).toBeTruthy();
    const get = await ctx.get(`/api/purchases/${doc.id}`);
    expect(get.status()).toBe(404);
  });

  test("serves a purchase PDF", async () => {
    const doc = await createPurchase();
    const res = await ctx.get(`/api/purchases/${doc.id}/pdf`);
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"]).toContain("application/pdf");
  });
});
