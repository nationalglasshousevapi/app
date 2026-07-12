// Import invoices from PDFs into the Supabase database.
// Usage:
//   npm run import-invoices [path/to/pdf]
//   DRY_RUN=true npm run import-invoices   ← parse only, don't insert

import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (dotenv isn't in node_modules)
function loadEnv(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnv(path.join(__dirname, "..", ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);
const DRY_RUN = process.env.DRY_RUN === "true";

// ── helpers ─────────────────────────────────────────────────────────

function parseCurrency(str) {
  if (!str && str !== 0) return 0;
  const cleaned = String(str).replace(/[₹,\s]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function financialYearFor(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const startYear = m >= 4 ? y : y - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function parseDate(str) {
  if (!str) return null;
  const m = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!m) return null;
  const month = MONTH_MAP[m[2].toLowerCase()];
  if (month === undefined) return null;
  return { year: parseInt(m[3]), month: month + 1, day: parseInt(m[1]) };
}

function fmtDate(d) {
  if (!d) return null;
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

// ── Split full PDF text into individual invoices ────────────────────

function splitInvoices(fullText) {
  const clean = fullText.replace(/--\s*\d+\s+of\s+\d+\s*--\s*/g, "");
  const parts = clean.split(/(?=INVOICE\nINVOICE No\. \tDATE\nAddr:)/);
  return parts.filter((p) => p.includes("BILL TO") && p.includes("TOTAL AMOUNT"));
}

// ── Parse one complete invoice text ─────────────────────────────────

function parseInvoice(text) {
  const lines = text.split("\n").map((l) => l.trim());
  const result = { items: [], errors: [] };

  // ── Header ────────────────────────────────────────────────────
  const addrLine = lines.find((l) => l.startsWith("Addr:"));
  if (addrLine) {
    const parts = addrLine.split("\t").map((p) => p.trim());
    result.invoiceNumber = parts[2] || "";
    result.invoiceDate = parseDate(parts[3]);
  } else {
    result.errors.push("No address line found");
  }

  // Order number/date
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("ORDER No.") && lines[i + 1]) {
      const parts = lines[i + 1].split("\t").map((p) => p.trim());
      for (const p of parts) {
        if (/^\d{1,3}$/.test(p) && p !== "-" && p !== "–") result.orderNumber = p;
        if (/^\d{1,2}\s+\w+\s+\d{4}$/.test(p)) result.orderDate = parseDate(p);
      }
      break;
    }
  }

  // ── Customer info ─────────────────────────────────────────────
  const billToIdx = lines.findIndex((l) => l.includes("BILL TO"));
  const descIdx = lines.findIndex((l) => l.includes("DESCRIPTION") && l.includes("HSN Code"));

  if (billToIdx >= 0 && descIdx > billToIdx) {
    const custLines = lines.slice(billToIdx + 1, descIdx).filter(Boolean);
    if (custLines.length > 0) {
      const leftParts = custLines.map((l) => l.split("\t")[0].trim()).filter(Boolean);
      result.customerName = leftParts[0] || "";

      const addrs = [];
      for (let k = 1; k < leftParts.length; k++) {
        const p = leftParts[k];
        if (/^\+?\d{10,12}$/.test(p.replace(/[-\s]/g, ""))) {
          result.customerPhone = p;
        } else if (p.includes("@")) {
          result.customerEmail = p;
        } else if (p.startsWith("GST:")) {
          const gstVal = p.replace("GST:", "").trim();
          if (gstVal) result.customerGst = gstVal;
        } else if (/^\d{2}\w{13}\d\w$/.test(p.replace(/\s/g, ""))) {
          result.customerGst = p;
        } else if (/^M[rs][s]?\s/.test(p)) {
          result.contactPerson = p;
        } else {
          addrs.push(p);
        }
      }
      result.customerAddress = addrs.filter(Boolean).join(", ");

      const firstParts = custLines[0].split("\t").map((p) => p.trim());
      if (firstParts.length >= 2 && firstParts[1] && firstParts[0] !== firstParts[1]) {
        result.shipToName = firstParts[1];
      }

      for (const l of custLines) {
        const parts = l.split("\t").map((p) => p.trim());
        for (let j = 1; j < parts.length; j++) {
          if (/^\+?\d{10,12}$/.test(parts[j].replace(/[-\s]/g, "")))
            result.customerPhone = result.customerPhone || parts[j];
          if (/^M[rs][s]?\s/.test(parts[j]))
            result.contactPerson = result.contactPerson || parts[j];
        }
      }
    }
  }

  // ── Line items ────────────────────────────────────────────────
  if (descIdx >= 0) {
    let itemsEnd = lines.findIndex(
      (l, i) => i > descIdx && (l.includes("Remarks / Payment") || l.includes("SUBTOTAL"))
    );
    if (itemsEnd < 0) itemsEnd = lines.length;

    const itemLines = lines.slice(descIdx + 1, itemsEnd).filter(Boolean).map((l) => l.trim());

    // Helper: parse a tabbed summary line into qty/unit/rate/total
    function parseSummaryLine(summaryLine) {
      const parts = summaryLine.split("\t").map((p) => p.trim());
      const nonCurrencyParts = parts.filter((p) => !p.startsWith("₹") && p !== "");
      const allCurrency = [];
      for (const p of parts) {
        if (p.startsWith("₹")) {
          const vals = p.match(/₹\s*[\d,]+\.?\d*/g);
          if (vals) allCurrency.push(...vals);
        }
      }
      let qty = 0, rate = 0, total = 0, unit = "sqft";
      if (allCurrency.length >= 3) {
        const uMatch = allCurrency[0].match(/₹\s*[\d,]+\.?\d*\s*(sqft|sq\.ft|each)/i);
        if (uMatch) unit = uMatch[1].toLowerCase();
        rate = parseCurrency(allCurrency[allCurrency.length - 2]);
        total = parseCurrency(allCurrency[allCurrency.length - 1]);
      } else if (allCurrency.length >= 2) {
        rate = parseCurrency(allCurrency[0]);
        total = parseCurrency(allCurrency[1]);
      } else if (allCurrency.length === 1) {
        total = parseCurrency(allCurrency[0]);
      }
      for (const p of nonCurrencyParts) {
        if (/^\d+(\.\d+)?$/.test(p) && parseFloat(p) > 0) { qty = parseFloat(p); break; }
      }
      return { qty: qty > 0 ? qty : 1, unit, rate, total };
    }

    // Group lines into item blocks, skipping "₹ 0.00" placeholders
    const blocks = [];
    let current = [];

    function flushBlock() {
      while (current.length > 0 && /^₹\s*0\.?\d*$/.test(current[0])) current.shift();
      if (current.length > 0) blocks.push({ type: "product", lines: current });
      current = [];
    }

    for (const line of itemLines) {
      // Skip placeholders and stray timestamps that leak over page boundaries
      if (/^₹\s*0\.?\d*$/.test(line)) continue;
      if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}$/.test(line)) continue;

      if (line.includes("shipping/loading/transporting")) {
        flushBlock();
        blocks.push({ type: "shipping", lines: [line] });
        continue;
      }
      current.push(line);
      if (line.includes("\t") && (line.match(/₹/g) || []).length >= 2) {
        flushBlock();
      }
    }
    flushBlock();

    for (const block of blocks) {
      if (block.type === "shipping") {
        const m = block.lines[0].match(/₹\s*([\d,]+\.?\d*)/);
        const amount = m ? parseCurrency(m[0]) : 0;
        result.items.push({
          description: "Shipping/Loading/Transporting",
          size: null, hsn_code: null,
          qty: amount > 0 ? 1 : 0, unit: "each", rate: amount, total: amount,
        });
        continue;
      }

      const blines = block.lines;
      if (blines.length === 0) continue;

      const firstLine = blines[0];
      const allParts = firstLine.split("\t").map((p) => p.trim());
      const isSizeFirst = /\d+\s*x\s*\d+/.test(allParts[0]);

      if (blines.length === 1) {
        // Single-line item: everything on one line.
        // Format: "<desc> \t<qty> \t<unit_info> \t<rate> \t<total>"
        // or "<size> \t<qty> \t<unit_info> \t<rate> \t<total>"
        const parsed = parseSummaryLine(firstLine);
        let description = allParts[0] || "Item";
        let hsn = "";
        let size = null;

        if (isSizeFirst) {
          // "34 1/2 x 42 1/2 - 1 \t1 \t₹..."
          size = allParts[0];
          description = "Item";
          if (allParts.length >= 2) {
            const hsnMatch = allParts[1].match(/(\d{4,8})/);
            if (hsnMatch) hsn = hsnMatch[1];
          }
        } else {
          // "glass fabrication chargeas \t1 \t₹ 1.00 each \t₹ 450..."
          // description already = allParts[0]
          if (allParts.length >= 2) {
            const hsnMatch = allParts[1].match(/(\d{4,8})/);
            if (hsnMatch) hsn = hsnMatch[1];
          }
          // Check if second-to-last allParts has a HSN-like code
        }

        result.items.push({
          description,
          size,
          hsn_code: hsn || null,
          qty: parsed.qty, unit: parsed.unit, rate: parsed.rate, total: parsed.total,
        });
        continue;
      }

      // Multi-line item: first line has description
      let description = allParts[0] || "Item";
      let hsn = "";
      if (allParts.length >= 2) {
        const hsnMatch = allParts[1].match(/(\d{4,8})/);
        if (hsnMatch) hsn = hsnMatch[1];
      }

      let summaryLine = "";
      const sizeLines = [];
      const extraDesc = [];
      for (let i = 1; i < blines.length; i++) {
        const l = blines[i];
        if (l.includes("\t") && (l.match(/₹/g) || []).length >= 2) {
          summaryLine = l;
        } else if (/\d+\s*x\s*\d+/.test(l)) {
          sizeLines.push(l);
        } else {
          extraDesc.push(l.trim());
        }
      }

      if (extraDesc.length > 0) {
        description += " - " + extraDesc.filter(Boolean).join(", ");
      }

      if (summaryLine) {
        const parsed = parseSummaryLine(summaryLine);
        result.items.push({
          description: description.replace(/\s+$/, ""),
          size: sizeLines.join("\n") || null,
          hsn_code: hsn || null,
          qty: parsed.qty, unit: parsed.unit, rate: parsed.rate, total: parsed.total,
        });
      }
    }
  }

  // ── Totals ────────────────────────────────────────────────────
  for (const line of lines) {
    if (line.includes("SUBTOTAL")) {
      const m = line.match(/₹\s*([\d,]+\.?\d*)/);
      if (m) result.subtotal = parseCurrency(m[0]);
    }
    if (/^CGST\s/.test(line)) {
      const m = line.match(/₹\s*([\d,]+\.?\d*)/);
      if (m) result.cgstAmount = parseCurrency(m[0]);
    }
    if (/^SGST\s/.test(line)) {
      const m = line.match(/₹\s*([\d,]+\.?\d*)/);
      if (m) result.sgstAmount = parseCurrency(m[0]);
    }
    if (line.includes("SHIPPING/HANDLING/ROUND-OFF")) {
      const neg = line.includes("-₹");
      const m = line.match(/₹\s*([\d,]+\.?\d*)/);
      if (m) {
        result.roundOff = parseCurrency(m[0]);
        if (neg && result.roundOff > 0) result.roundOff = -result.roundOff;
      }
    }
    if (line.includes("TOTAL AMOUNT")) {
      const m = line.match(/₹\s*([\d,]+\.?\d*)/);
      if (m) result.totalAmount = parseCurrency(m[0]);
    }
  }

  result.taxType = "cgst_sgst";
  result.taxRate = 0.18;
  return result;
}

// ── Database operations ─────────────────────────────────────────────

async function findOrCreateCustomer(invoice) {
  const { customerName: name, customerGst: gst } = invoice;
  if (!name) return null;

  if (gst) {
    const { data } = await supabase.from("customers").select("id").eq("gst", gst).maybeSingle();
    if (data) return data.id;
  }

  const norm = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const { data: matches } = await supabase.from("customers").select("id, name");
  if (matches) {
    for (const c of matches) {
      if (c.name.toLowerCase().replace(/[^a-z0-9]/g, "") === norm) return c.id;
    }
  }

  const payload = {
    name,
    address: invoice.customerAddress || null,
    contact_person: invoice.contactPerson || null,
    contact_number: invoice.customerPhone || null,
    email: invoice.customerEmail || null,
    gst: gst || null,
  };
  const { data, error } = await supabase.from("customers").insert(payload).select("id").single();
  if (error) {
    console.error(`  ✗ Failed to create customer "${name}": ${error.message}`);
    return null;
  }
  console.log(`  ✓ Created customer: ${name}`);
  return data.id;
}

async function insertDocument(invoice, customerId) {
  const docDate = invoice.invoiceDate || { year: 2026, month: 4, day: 1 };
  const d = new Date(docDate.year, docDate.month - 1, docDate.day);
  const fy = financialYearFor(d);
  const invNum = String(invoice.invoiceNumber || "").padStart(4, "0");
  const docNumber = `INV-${fy}-${invNum}`;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      doc_type: "invoice",
      doc_number: docNumber,
      financial_year: fy,
      doc_date: fmtDate(docDate),
      order_number: invoice.orderNumber || null,
      order_date: invoice.orderDate ? fmtDate(invoice.orderDate) : null,
      customer_id: customerId,
      bill_to_name: invoice.customerName,
      bill_to_address: invoice.customerAddress || null,
      bill_to_contact_person: invoice.contactPerson || null,
      bill_to_contact_number: invoice.customerPhone || null,
      bill_to_email: invoice.customerEmail || null,
      bill_to_gst: invoice.customerGst || null,
      ship_to_name: invoice.shipToName || null,
      subtotal: invoice.subtotal || 0,
      tax_type: "cgst_sgst",
      tax_rate: 0.18,
      cgst_amount: invoice.cgstAmount || 0,
      sgst_amount: invoice.sgstAmount || 0,
      igst_amount: 0,
      round_off: invoice.roundOff || 0,
      total_amount: invoice.totalAmount || 0,
      status: "sent",
    })
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ DB insert error: ${error.message}`);
    return null;
  }
  return data.id;
}

async function insertItems(documentId, items) {
  const filtered = items.filter(
    (it) => !(it.description === "Shipping/Loading/Transporting" && it.total === 0)
  );
  if (filtered.length === 0) return true;

  const rows = filtered.map((it, idx) => ({
    document_id: documentId,
    position: idx,
    description: it.description || "Item",
    hsn_code: it.hsn_code || null,
    qty: it.qty > 0 ? it.qty : 1,
    unit: it.unit || "sqft",
    rate: it.rate || 0,
    total: it.total || 0,
  }));

  const { error } = await supabase.from("document_items").insert(rows);
  if (error) {
    console.error(`  ✗ Items insert error: ${error.message}`);
    await supabase.from("documents").delete().eq("id", documentId);
    return false;
  }
  return true;
}

async function updateCounter() {
  const fy = "26-27";
  const { data } = await supabase
    .from("documents")
    .select("doc_number")
    .eq("doc_type", "invoice")
    .eq("financial_year", fy)
    .order("doc_number", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const m = data[0].doc_number.match(/(\d+)$/);
    if (m) {
      await supabase.from("counters").upsert(
        { doc_type: "invoice", financial_year: fy, last_number: parseInt(m[1]) },
        { onConflict: "doc_type, financial_year" }
      );
      console.log(`  Counter updated: ${fy} → ${m[1]}`);
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const target = process.argv[2] || path.join(__dirname, "..", "data", "invoices_pdf", "Invoice-3.pdf");

  if (!fs.existsSync(target)) {
    console.error(`File not found: ${target}\nUsage: npm run import-invoices [path/to/pdf]`);
    process.exit(1);
  }

  console.log(`Reading PDF: ${target}`);
  const buf = fs.readFileSync(target);
  const parser = new PDFParse(new Uint8Array(buf));
  await parser.load();
  const { text } = await parser.getText();

  const invoiceTexts = splitInvoices(text);
  if (invoiceTexts.length === 0) {
    console.error("No invoices found in PDF.");
    process.exit(1);
  }

  console.log(`\nFound ${invoiceTexts.length} invoices.${DRY_RUN ? " (DRY RUN - no inserts)" : ""}\n`);

  let success = 0, failed = 0;

  for (let i = 0; i < invoiceTexts.length; i++) {
    const invoice = parseInvoice(invoiceTexts[i]);
    const dateStr = invoice.invoiceDate ? fmtDate(invoice.invoiceDate) : "?";
    const itemCount = (invoice.items || []).length;

    console.log(`--- Invoice ${i + 1}/${invoiceTexts.length} ---`);
    console.log(`  #${invoice.invoiceNumber || "?"} | ${invoice.customerName || "Unknown"} | ${dateStr}`);
    console.log(`  Items: ${itemCount} | Sub: ₹${invoice.subtotal || 0} | CGST: ₹${invoice.cgstAmount || 0} | SGST: ₹${invoice.sgstAmount || 0} | Rnd: ${invoice.roundOff || 0} | Total: ₹${invoice.totalAmount || 0}`);

    // Print items
    for (const item of invoice.items) {
      if (item.description === "Shipping/Loading/Transporting" && item.total === 0) continue;
      const desc = (item.description || "").substring(0, 45);
      const size = item.size ? item.size.substring(0, 20) : "";
      console.log(`    → ${desc.padEnd(47)} ${size.padEnd(22)} qty:${item.qty} rate:${item.rate} total:₹${item.total}`);
    }

    if (!invoice.totalAmount && !DRY_RUN) {
      console.log(`  ⚠ No total found, skipping.`);
      failed++;
      continue;
    }

    if (!DRY_RUN) {
      const customerId = await findOrCreateCustomer(invoice);
      if (!customerId) { console.log(`  ✗ Could not find/create customer.`); failed++; continue; }

      const docId = await insertDocument(invoice, customerId);
      if (!docId) { failed++; continue; }

      const itemsOk = await insertItems(docId, invoice.items);
      if (!itemsOk) { failed++; continue; }

      console.log(`  ✓ Imported (docId: ${docId})`);
      success++;
    } else {
      console.log(`  ✓ (dry run)`);
      success++;
    }
  }

  if (success > 0 && !DRY_RUN) {
    try { await updateCounter(); } catch (_) {}
  }

  console.log(`\n=== ${DRY_RUN ? "Dry run" : "Import"} complete ===`);
  console.log(`  ✓ ${success} invoices ${DRY_RUN ? "parsed" : "imported"}`);
  if (failed > 0) console.log(`  ✗ ${failed} failed`);
  console.log("");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
