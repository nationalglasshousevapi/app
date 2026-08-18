import { test, expect, type APIRequestContext } from "@playwright/test";
import { api, createTestDocWithGlass, cleanupTestData, TEST_PREFIX } from "./helpers";

test.describe("Optimizer pieces API", () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await api();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("returns glass pieces with dimensions from a document", async () => {
    const { document: doc } = await createTestDocWithGlass();
    const res = await ctx.get(`/api/optimizer/pieces?id=${doc.id}`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.docType).toBe("quotation");

    // The charge item should be excluded; the glass piece mapped
    expect(json.pieces.length).toBe(1);
    expect(json.pieces[0]).toMatchObject({
      w: 48,
      h: 36,
      qty: 12,
    });
    expect(typeof json.pieces[0].label).toBe("string");
  });

  test("returns empty pieces for a document with no glass items", async () => {
    const res = await ctx.post("/api/documents", {
      data: {
        doc_type: "quotation",
        doc_date: new Date().toISOString().slice(0, 10),
        bill_to_name: `${TEST_PREFIX} NoGlass ${Date.now()}`,
        tax_type: "none",
        tax_rate: 0,
        status: "draft",
        items: [{ description: `${TEST_PREFIX} charge only`, qty: 1, rate: 5, item_type: "charge" }],
      },
    });
    const { document: doc } = await res.json();
    const piecesRes = await ctx.get(`/api/optimizer/pieces?id=${doc.id}`);
    const json = await piecesRes.json();
    expect(json.pieces).toEqual([]);
  });

  test("rejects missing document id", async () => {
    const res = await ctx.get("/api/optimizer/pieces");
    expect(res.status()).toBe(400);
  });

  test("rejects unknown document", async () => {
    const res = await ctx.get("/api/optimizer/pieces?id=00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });
});

test.describe("Customer quick-create", () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await api();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("creates a customer with just a name", async () => {
    const res = await ctx.post("/api/customers", {
      data: { name: `${TEST_PREFIX} WalkIn ${Date.now()}` },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.customer.id).toBeTruthy();
    expect(json.customer.name).toContain(TEST_PREFIX);
  });

  test("creates a customer with name and phone, optional fields null", async () => {
    const res = await ctx.post("/api/customers", {
      data: { name: `${TEST_PREFIX} Phone ${Date.now()}`, contact_number: "9876543210" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.customer.contact_number).toBe("9876543210");
    expect(json.customer.address).toBeNull();
    expect(json.customer.gst).toBeNull();
  });

  test("search finds the new customer by name", async () => {
    const name = `${TEST_PREFIX} Searchable ${Date.now()}`;
    const createRes = await ctx.post("/api/customers", { data: { name } });
    const { customer } = await createRes.json();

    const res = await ctx.get(`/api/customers?q=${encodeURIComponent(name)}`);
    const json = await res.json();
    expect(json.customers.some((c: any) => c.id === customer.id)).toBe(true);
  });
});
