import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const excluded = "status not in ('cancelled', 'converted')";
const convertedFilter = '.neq("status", "converted")';

describe("converted documents are counted once", () => {
  it("ledger view and dashboard aggregations skip converted rows", () => {
    for (const file of [
      "supabase/schema.sql",
      "supabase/migrations/0011_ledger_exclude_converted.sql",
    ]) {
      expect(read(file).split(excluded).length - 1).toBe(7);
    }
  });

  it("ledger queries exclude converted sources", () => {
    for (const file of [
      "src/lib/ledger.ts",
      "src/app/accounts/[customerId]/page.tsx",
    ]) {
      expect(read(file).split(convertedFilter).length - 1).toBe(2);
    }

    for (const file of [
      "src/app/api/customers/[id]/ledger/route.ts",
      "src/app/api/customers/[id]/summary/route.ts",
      "src/app/daybook/page.tsx",
      "src/app/api/reports/gst/route.ts",
      "src/app/dashboard/page.tsx",
      "src/app/api/customers/stats/route.ts",
    ]) {
      expect(read(file)).toContain(convertedFilter);
    }
  });

  it("customer page money totals skip converted and cancelled docs", () => {
    const content = read("src/app/customers/[id]/page.tsx");
    expect(content).toContain(
      'd.doc_type === "invoice" || d.doc_type === "order"'
    );
    expect(content).toContain('d.status !== "converted"');
    expect(content).toContain('d.status !== "cancelled"');
  });
});
