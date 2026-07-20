export interface ParsedItem {
  description: string;
  size: string;
  hsn_code: string;
  qty: number;
  unit: string;
  rate: number;
  actual_length: number;
  actual_width: number;
  nos: number;
  calculated_length: number;
  calculated_width: number;
  item_type: "glass" | "charge";
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
      actual_length: Number(row.actual_length ?? 0),
      actual_width: Number(row.actual_width ?? 0),
      nos: Number(row.nos ?? 1),
      calculated_length: Number(row.calculated_length ?? 0),
      calculated_width: Number(row.calculated_width ?? 0),
      item_type: (row.item_type as string) === "charge" ? "charge" : "glass",
    };
  });
}

export interface TaxBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
}

export type TaxableCharge = {
  label: string;
  amount: number;
};

export function computeTaxableChargesTotal(charges: TaxableCharge[]): number {
  return charges.reduce((sum, c) => sum + (c.amount || 0), 0);
}

export function computeTax(
  subtotal: number,
  taxType: string,
  taxRate: number,
  discountAmount: number = 0,
  taxableCharges: TaxableCharge[] = [],
): TaxBreakdown {
  const taxableAmount = subtotal + computeTaxableChargesTotal(taxableCharges) - discountAmount;
  let cgst = 0,
    sgst = 0,
    igst = 0;
  if (taxType === "cgst_sgst") {
    cgst = Math.round(((taxableAmount * taxRate) / 2) * 100) / 100;
    sgst = cgst;
  } else if (taxType === "igst") {
    igst = Math.round(taxableAmount * taxRate * 100) / 100;
  }
  return { cgst, sgst, igst };
}

export type AdditionalCharge = {
  label: string;
  amount: number;
};

export function computeAdditionalChargesTotal(charges: AdditionalCharge[]): number {
  return charges.reduce((sum, c) => sum + (c.amount || 0), 0);
}

/**
 * Compute the round-off adjustment for standard rounding:
 * - Fractional part < 0.50 → round down (negative adjustment)
 * - Fractional part >= 0.50 → round up (positive adjustment)
 */
export function computeRoundOff(amount: number): number {
  const rounded = Math.round(amount);
  return rounded - amount;
}

export function computeTotal(
  subtotal: number,
  cgst: number,
  sgst: number,
  igst: number,
  discountAmount: number = 0,
  additionalCharges: AdditionalCharge[] = [],
  taxableCharges: TaxableCharge[] = [],
): { totalAmount: number; roundOff: number } {
  const taxableAmount = subtotal + computeTaxableChargesTotal(taxableCharges) - discountAmount;
  const extraCharges = computeAdditionalChargesTotal(additionalCharges);
  const raw = taxableAmount + cgst + sgst + igst + extraCharges;
  const totalAmount = Math.round(raw);
  const roundOff = totalAmount - raw;
  return { totalAmount, roundOff };
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
    actual_length: it.actual_length || 0,
    actual_width: it.actual_width || 0,
    nos: it.nos || 1,
    calculated_length: it.calculated_length || 0,
    calculated_width: it.calculated_width || 0,
    item_type: it.item_type || "glass",
  }));
}
