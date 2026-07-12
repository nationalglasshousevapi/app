// Imports data/customers_seed.csv (exported from the original Excel workbook's
// "Customer Details" sheet) into the `customers` table.
//
// Usage:
//   1. Fill in .env.local with your Supabase URL + service role key
//   2. npm run seed

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env.local (same file Next.js uses) rather than the default .env
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local and re-run."
  );
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const csvPath = path.join(__dirname, "..", "data", "customers_seed.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true });

  console.log(`Found ${rows.length} customers in ${csvPath}`);

  const payload = rows
    .filter((r) => r.name && r.name.trim())
    .map((r) => ({
      name: r.name.trim(),
      address: r.address?.trim() || null,
      contact_person: r.contact_person?.trim() || null,
      contact_number: r.contact_number?.trim() || null,
      email: r.email?.trim() || null,
      gst: r.gst?.trim() || null,
    }));

  const { data, error } = await supabase.from("customers").insert(payload).select("id");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`Inserted ${data.length} customers.`);
}

main();
