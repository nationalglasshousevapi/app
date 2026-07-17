export type DocType =
  | "invoice"
  | "quotation"
  | "performa_invoice"
  | "estimate"
  | "receipt";

export const DOC_TYPES: { value: DocType; label: string; short: string }[] = [
  { value: "invoice", label: "Invoice", short: "INV" },
  { value: "quotation", label: "Quotation", short: "QTN" },
  { value: "performa_invoice", label: "Performa Invoice", short: "PFI" },
  { value: "estimate", label: "Estimate", short: "EST" },
  { value: "receipt", label: "Receipt", short: "RCP" },
];

export function docTypeLabel(t: string): string {
  return DOC_TYPES.find((d) => d.value === t)?.label ?? t;
}

export function docTypeShort(t: string): string {
  return DOC_TYPES.find((d) => d.value === t)?.short ?? "DOC";
}

// Indian financial year runs April -> March. Given a JS Date, return "24-25" style string.
export function financialYearFor(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-12
  const startYear = m >= 4 ? y : y - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}
