import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local so tests can authenticate and clean up test data.
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

export const TEST_PREFIX = "__TEST__";

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} — set it in .env.local`);
  return v;
}

let cachedApi: APIRequestContext | null = null;

/** Authenticated API request context (logs in via the real login route). */
export async function api(): Promise<APIRequestContext> {
  if (cachedApi) return cachedApi;
  const ctx = await pwRequest.newContext({ baseURL: "http://localhost:3000" });
  const res = await ctx.post("/api/auth/login", {
    data: { password: env("ADMIN_PASSWORD") },
  });
  if (!res.ok()) {
    throw new Error(`Login to test app failed with status ${res.status()}`);
  }
  cachedApi = ctx;
  return ctx;
}

/** Service-role Supabase client for seeding + cleanup. */
export function sb(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

function stamp(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Create a test customer directly via the service role. */
export async function createTestCustomer(name?: string) {
  const fullName = name ?? `${TEST_PREFIX} Customer ${stamp()}`;
  const { data, error } = await sb()
    .from("customers")
    .insert({ name: fullName, contact_number: "9999999999" })
    .select()
    .single();
  if (error) throw new Error(`createTestCustomer: ${error.message}`);
  return data;
}

/** Create a quotation through the API and return { document, customer }. */
export async function createTestQuotation(opts: {
  customerId?: string | null;
  billToName?: string;
  recordAmount?: number;
} = {}) {
  const ctx = await api();
  const customerId = opts.customerId ?? null;
  const billToName = opts.billToName ?? `${TEST_PREFIX} Quote Customer ${stamp()}`;
  const amount = opts.recordAmount ?? 1000;

  const res = await ctx.post("/api/documents", {
    data: {
      doc_type: "quotation",
      doc_date: new Date().toISOString().slice(0, 10),
      customer_id: customerId,
      bill_to_name: billToName,
      tax_type: "cgst_sgst",
      tax_rate: 0.18,
      status: "draft",
      items: [
        {
          description: `${TEST_PREFIX} glass piece`,
          size: "24x24",
          qty: 2,
          unit: "sq.ft",
          rate: 100,
          actual_length: 24,
          actual_width: 24,
          nos: 2,
          calculated_length: 24,
          calculated_width: 24,
          item_type: "glass",
        },
      ],
    },
  });
  const json = await res.json();
  if (!res.ok()) throw new Error(`createTestQuotation failed (${res.status()}): ${JSON.stringify(json)}`);
  return { document: json.document, billToName };
}

/** Create a quotation with a glass piece for the optimizer-pieces endpoint. */
export async function createTestDocWithGlass(customerId: string | null = null) {
  const ctx = await api();
  const billToName = `${TEST_PREFIX} Optimizer Customer ${stamp()}`;
  const res = await ctx.post("/api/documents", {
    data: {
      doc_type: "quotation",
      doc_date: new Date().toISOString().slice(0, 10),
      customer_id: customerId,
      bill_to_name: billToName,
      tax_type: "cgst_sgst",
      tax_rate: 0.18,
      status: "draft",
      items: [
        {
          description: `${TEST_PREFIX} glass`,
          size: "48x36",
          qty: 12,
          unit: "sq.ft",
          rate: 50,
          actual_length: 48,
          actual_width: 36,
          nos: 12,
          calculated_length: 48,
          calculated_width: 36,
          item_type: "glass",
        },
        {
          description: `${TEST_PREFIX} charge`,
          size: "",
          qty: 1,
          unit: "nos",
          rate: 500,
          item_type: "charge",
        },
      ],
    },
  });
  const json = await res.json();
  if (!res.ok()) throw new Error(`createTestDocWithGlass failed (${res.status()}): ${JSON.stringify(json)}`);
  return { document: json.document, billToName };
}

/**
 * Remove all test data: customers (cascades to payments), documents
 * (cascades to items), and receipts created by convert.
 */
export async function cleanupTestData() {
  const client = sb();

  const { data: docs } = await client
    .from("documents")
    .select("id")
    .ilike("bill_to_name", `%${TEST_PREFIX}%`);
  const docIds = (docs ?? []).map((d) => d.id);
  if (docIds.length > 0) {
    await client.from("documents").delete().in("id", docIds);
  }

  const { data: customers } = await client
    .from("customers")
    .select("id")
    .ilike("name", `%${TEST_PREFIX}%`);
  const custIds = (customers ?? []).map((c) => c.id);
  if (custIds.length > 0) {
    // payments cascade on customer delete
    await client.from("customers").delete().in("id", custIds);
  }
}
