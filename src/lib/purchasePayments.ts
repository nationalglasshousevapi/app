export type PurchasePayment = {
  id: string;
  document_id: string;
  payment_date: string;
  amount: number | string;
  payment_mode: string;
  reference_number: string | null;
  notes: string | null;
};

export function purchasePaymentSummary(
  totalAmount: number | string,
  payments: Pick<PurchasePayment, "amount">[]
) {
  const total = Number(totalAmount);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Math.round((total - totalPaid) * 100) / 100;

  return {
    total,
    totalPaid,
    balance,
    isPaid: balance <= 0,
  };
}
