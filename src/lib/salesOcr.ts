// AI extraction for outgoing sales documents (quotation / order / performa invoice).
// Shares the same vision-model transport as the purchase-invoice scanner, but
// uses a sales-specific schema. The caller still asks the user to pick the
// document type AFTER extraction; this module only reads what is printed.

import { callModel, parseJsonLoose } from "@/lib/ocr";

export interface ExtractedSalesItem {
  description: string;
  hsn_code: string;
  actual_length_in: number;
  actual_width_in: number;
  nos: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface ExtractedSalesDocument {
  customer_name: string;
  customer_gst: string;
  customer_address: string;
  customer_contact_person: string;
  customer_contact_number: string;
  customer_email: string;
  doc_number: string;
  doc_date: string;
  tax_type: "cgst_sgst" | "igst" | "none";
  tax_rate_percent: number;
  items: ExtractedSalesItem[];
}

export type SalesOcrResult =
  { ok: true; data: ExtractedSalesDocument } | { ok: false; reason: string };

const SYSTEM_PROMPT = `You are a precise data-extraction engine for an outgoing sales document from a glass business. Given a photo or PDF of a quotation, order, performa invoice, or invoice, extract ALL fields into JSON matching exactly this schema:

{
  "customer_name": string,       // bill-to customer name
  "customer_gst": string,        // GSTIN if present, else ""
  "customer_address": string,
  "customer_contact_person": string,
  "customer_contact_number": string,
  "customer_email": string,
  "doc_number": string,          // printed document number, else ""
  "doc_date": string,            // "YYYY-MM-DD" or ""
  "tax_type": "cgst_sgst" | "igst" | "none",
  "tax_rate_percent": number,    // e.g. 18
  "items": [
    {
      "description": string,
      "hsn_code": string,
      "actual_length_in": number, // glass length in inches as printed, 0 if absent
      "actual_width_in": number,  // glass width in inches as printed, 0 if absent
      "nos": number,              // number of pieces for this line, 1 if absent
      "unit": "sq.ft" | "rn ft" | "nos",
      "rate": number,             // rate as printed
      "amount": number            // this row's printed Amount column before tax, 0 if absent
    }
  ]
}

Rules:
- Copy numbers exactly as printed; never calculate or correct values.
- Do NOT guess the document type — the user decides that after extraction.
- Use "" for missing text fields and 0 for missing numbers.
- The document may span several pages; merge line items from every page into a single "items" array.
- Output ONLY the JSON object, no markdown fences, no commentary.`;

function num(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function normalize(raw: unknown): ExtractedSalesDocument {
  const r = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = Array.isArray(r.items) ? r.items : [];
  const taxTypeRaw = str(r.tax_type);
  const taxType =
    taxTypeRaw === "igst" || taxTypeRaw === "none" || taxTypeRaw === "cgst_sgst"
      ? (taxTypeRaw as ExtractedSalesDocument["tax_type"])
      : "cgst_sgst";

  const dateRaw = str(r.doc_date);
  let docDate = "";
  const m = dateRaw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    docDate = `${m[1]}-${m[2]}-${m[3]}`;
  } else {
    const d2 = dateRaw.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (d2) {
      const y = d2[3].length === 2 ? `20${d2[3]}` : d2[3];
      docDate = `${y}-${d2[2].padStart(2, "0")}-${d2[1].padStart(2, "0")}`;
    }
  }

  return {
    customer_name: str(r.customer_name),
    customer_gst: str(r.customer_gst),
    customer_address: str(r.customer_address),
    customer_contact_person: str(r.customer_contact_person),
    customer_contact_number: str(r.customer_contact_number),
    customer_email: str(r.customer_email),
    doc_number: str(r.doc_number),
    doc_date: docDate,
    tax_type: taxType,
    tax_rate_percent:
      taxType === "none"
        ? 0
        : num(r.tax_rate_percent) > 0
          ? num(r.tax_rate_percent)
          : 18,
    items: itemsRaw.map((it) => {
      const i = (it ?? {}) as Record<string, unknown>;
      const unit = str(i.unit);
      return {
        description: str(i.description),
        hsn_code: str(i.hsn_code),
        actual_length_in: num(i.actual_length_in),
        actual_width_in: num(i.actual_width_in),
        nos: Math.max(1, Math.round(num(i.nos)) || 1),
        unit:
          unit === "rn ft" || unit === "nos" || unit === "sq.ft"
            ? unit
            : "sq.ft",
        rate: num(i.rate),
        amount: num(i.amount),
      };
    }),
  };
}

export async function extractSalesDocument(
  base64File: string,
  mimeType: string
): Promise<SalesOcrResult> {
  const apiKey = process.env.OCR_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      reason: "OCR_API_KEY is not configured on the server.",
    };
  }
  const baseUrl = process.env.OCR_BASE_URL || "https://api.deepseek.com";
  const model = process.env.OCR_MODEL || "deepseek-v4-flash-vision-exp";
  const fallback = process.env.OCR_FALLBACK_MODEL;
  const models = fallback && fallback !== model ? [model, fallback] : [model];

  let content = "";
  for (const m of models) {
    const attempt = await callModel(
      baseUrl,
      apiKey,
      m,
      mimeType,
      base64File,
      SYSTEM_PROMPT,
      "Extract this sales document into the JSON schema."
    );
    if (attempt.ok) {
      content = attempt.content;
      break;
    }
    if (!attempt.retryable || m === models[models.length - 1]) {
      return { ok: false, reason: attempt.reason };
    }
  }

  try {
    const data = normalize(parseJsonLoose(content));
    if (!data.items.length) {
      return {
        ok: false,
        reason:
          "No line items were found in the document. Try a clearer scan or photo.",
      };
    }
    if (!data.customer_name && !data.doc_number) {
      return {
        ok: false,
        reason: "This does not look like a sales document.",
      };
    }
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      reason:
        "Could not parse the extracted data. Please enter the details manually.",
    };
  }
}
