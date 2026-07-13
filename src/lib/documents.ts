export interface ParsedItem {
  description: string;
  size: string;
  hsn_code: string;
  qty: number;
  unit: string;
  rate: number;
}

export function parseItems(rawItems: unknown[]): ParsedItem[] {
  return rawItems.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      description: String(row.description ?? "").trim(),
      size: String(row.size ?? "").trim(),
      hsn_code: String(row.hsn_code ?? "").trim(),
      qty: Number(row.qty),
      unit: String(row.unit ?? "sq.ft").trim() || "sq.ft",
      rate: Number(row.rate),
    };
  });
}

export interface TaxBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
}

export function computeTax(
  subtotal: number,
  taxType: string,
  taxRate: number,
): TaxBreakdown {
  let cgst = 0,
    sgst = 0,
    igst = 0;
  if (taxType === "cgst_sgst") {
    cgst = Math.round(((subtotal * taxRate) / 2) * 100) / 100;
    sgst = cgst;
  } else if (taxType === "igst") {
    igst = Math.round(subtotal * taxRate * 100) / 100;
  }
  return { cgst, sgst, igst };
}

export function computeTotal(
  subtotal: number,
  cgst: number,
  sgst: number,
  igst: number,
  roundOff: number,
): number {
  return Math.round((subtotal + cgst + sgst + igst + roundOff) * 100) / 100;
}

export function formatItemRows(
  items: ParsedItem[],
  documentId: string,
) {
  return items.map((it, idx) => ({
    document_id: documentId,
    position: idx,
    description: it.description,
    size: it.size || null,
    hsn_code: it.hsn_code || null,
    qty: it.qty,
    unit: it.unit || "sq.ft",
    rate: it.rate,
    total: Math.round((it.qty || 0) * (it.rate || 0) * 100) / 100,
  }));
}
