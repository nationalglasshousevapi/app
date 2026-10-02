// AI invoice extraction adapter.
// Provider is configured via env vars so it can be swapped without code changes:
//   OCR_API_KEY        — API key (required to enable extraction)
//   OCR_BASE_URL       — default: https://api.deepseek.com
//   OCR_MODEL          — default: deepseek-v4-flash-vision-exp
//   OCR_FALLBACK_MODEL — optional second model tried once when the primary
//                        is overloaded (429/5xx) or unknown (404), e.g. a
//                        cheaper Flash from the same provider.
// Photos and PDFs are sent as data-URI attachments in the same image_url
// content part. PDF input needs a provider that accepts application/pdf
// there (Gemini does; OpenAI's chat/completions does not).
// The model output is ALWAYS a draft; the app recomputes all money math.

export interface ExtractedItem {
  description: string;
  hsn_code: string;
  thickness: number;
  width_mm: number;
  length_mm: number;
  pcs: number;
  qty_mts: number;
  rate: number;
  amount: number;
}

export interface ExtractedPurchase {
  supplier_name: string;
  supplier_gst: string;
  supplier_address: string;
  doc_number: string;
  doc_date: string; // YYYY-MM-DD or ""
  place_of_supply: string;
  irn: string;
  ack_number: string;
  bilty_number: string;
  vehicle_number: string;
  tax_type: "cgst_sgst" | "igst" | "none";
  tax_rate_percent: number;
  charges: { label: string; amount: number }[];
  items: ExtractedItem[];
}

export type OcrResult =
  { ok: true; data: ExtractedPurchase } | { ok: false; reason: string };

const SYSTEM_PROMPT = `You are a precise data-extraction engine for Indian GST tax invoices from glass suppliers. Given a photo or PDF of an invoice, extract ALL fields into JSON matching exactly this schema:

{
  "supplier_name": string,
  "supplier_gst": string,
  "supplier_address": string,
  "doc_number": string,          // the supplier's own invoice number, e.g. "MGW/26-27/0554"
  "doc_date": string,            // "YYYY-MM-DD"
  "place_of_supply": string,
  "irn": string,                 // IRN if present, else ""
  "ack_number": string,
  "bilty_number": string,        // bilty / LR / RR number, else ""
  "vehicle_number": string,
  "tax_type": "cgst_sgst" | "igst" | "none",
  "tax_rate_percent": number,    // e.g. 18
  "charges": [ { "label": string, "amount": number } ],  // admin charge, handling charge, freight etc. EXCLUDE taxes and round-off
  "items": [
    {
      "description": string,
      "hsn_code": string,
      "thickness": number,       // mm, e.g. 6 (0 if absent)
      "width_mm": number,        // mm (0 if absent)
      "length_mm": number,       // mm (0 if absent)
      "pcs": number,             // piece count (0 if absent)
      "qty_mts": number,         // quantity in Mts as printed
      "rate": number,            // rate as printed
      "amount": number           // this row's Amount column (before tax), 0 if absent
    }
  ]
}

Rules:
- Copy numbers exactly as printed; never calculate or correct values.
- Use "" for missing text fields and 0 for missing numbers.
- The invoice may span several pages; merge line items from every page into a single "items" array.
- Always fill "amount" with the printed Amount column of that row — many glass suppliers print "rate per MM", so the amount is the only reliable line value.
- Output ONLY the JSON object, no markdown fences, no commentary.`;

function num(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function parseJsonLoose(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Model did not return JSON");
  }
}

function normalize(raw: unknown): ExtractedPurchase {
  const r = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = Array.isArray(r.items) ? r.items : [];
  const chargesRaw = Array.isArray(r.charges) ? r.charges : [];
  const taxTypeRaw = str(r.tax_type);
  const taxType =
    taxTypeRaw === "igst" || taxTypeRaw === "none" || taxTypeRaw === "cgst_sgst"
      ? (taxTypeRaw as ExtractedPurchase["tax_type"])
      : str(r.igst) &&
          num(r.igst) > 0 &&
          !(num((r as Record<string, unknown>).cgst) > 0)
        ? "igst"
        : "igst"; // inter-state purchases are the norm for Vapi glass imports

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
    supplier_name: str(r.supplier_name),
    supplier_gst: str(r.supplier_gst),
    supplier_address: str(r.supplier_address),
    doc_number: str(r.doc_number),
    doc_date: docDate,
    place_of_supply: str(r.place_of_supply),
    irn: str(r.irn),
    ack_number: str(r.ack_number),
    bilty_number: str(r.bilty_number),
    vehicle_number: str(r.vehicle_number),
    tax_type: taxType,
    tax_rate_percent: num(r.tax_rate_percent) || 18,
    charges: chargesRaw
      .map((c) => ({
        label: str((c as Record<string, unknown>).label) || "Charge",
        amount: num((c as Record<string, unknown>).amount),
      }))
      .filter((c) => c.amount > 0),
    items: itemsRaw.map((it) => {
      const i = (it ?? {}) as Record<string, unknown>;
      return {
        description: str(i.description),
        hsn_code: str(i.hsn_code),
        thickness: num(i.thickness),
        width_mm: num(i.width_mm),
        length_mm: num(i.length_mm),
        pcs: Math.round(num(i.pcs)),
        qty_mts: num(i.qty_mts),
        rate: num(i.rate),
        amount: num(i.amount),
      };
    }),
  };
}

/**
 * The purchase form computes line amounts as qty × rate. Suppliers who print
 * their rate per MM ("115.00 per MM") only reconcile through the printed Amount
 * column, so the form uses amount ÷ qty as the effective rate whenever the
 * invoice shows an amount. Falls back to the printed rate otherwise.
 */
export function effectiveRate(
  printedRate: number,
  qty: number,
  amount: number
): number {
  if (amount > 0 && qty > 0) return Math.round((amount / qty) * 10000) / 10000;
  return printedRate;
}

export function isOcrConfigured(): boolean {
  return Boolean(process.env.OCR_API_KEY);
}

const BUSY_REASON =
  "The extraction model is busy right now (high demand). Please wait a minute and tap Extract again.";

async function callModel(
  baseUrl: string,
  apiKey: string,
  model: string,
  mimeType: string,
  base64File: string
): Promise<
  | { ok: true; content: string }
  | { ok: false; status: number; retryable: boolean; reason: string }
> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64File}` },
              },
              {
                type: "text",
                text: "Extract this purchase invoice into the JSON schema.",
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    return {
      ok: false,
      status: 0,
      retryable: true,
      reason: "Could not reach the extraction service. Check your connection.",
    };
  }

  if (!res.ok) {
    // Overload (429/5xx) and unknown model (404) are worth one retry with the
    // fallback model. Auth errors (401/403) and bad requests (400) would fail
    // the same way, so surface them immediately.
    const retryable =
      res.status === 404 || res.status === 429 || res.status >= 500;
    if (retryable) {
      return { ok: false, status: res.status, retryable, reason: BUSY_REASON };
    }
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      retryable,
      reason: `Extraction service error (${res.status}). ${body.slice(0, 200)}`,
    };
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  if (!content) {
    return {
      ok: false,
      status: res.status,
      retryable: false,
      reason: "Empty response from extraction service.",
    };
  }
  return { ok: true, content };
}

export async function extractPurchaseInvoice(
  base64File: string,
  mimeType: string
): Promise<OcrResult> {
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
    const attempt = await callModel(baseUrl, apiKey, m, mimeType, base64File);
    if (attempt.ok) {
      content = attempt.content;
      break;
    }
    if (!attempt.retryable || m === models[models.length - 1]) {
      return { ok: false, reason: attempt.reason };
    }
    // Otherwise fall through to the fallback model.
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
    if (!data.supplier_name && !data.doc_number) {
      return {
        ok: false,
        reason: "This does not look like a purchase invoice.",
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
