export const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer (NEFT/RTGS/IMPS)" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "adjustment", label: "Adjustment / Credit Note" },
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number]["value"];
