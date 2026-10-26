import type { SupabaseClient } from "@supabase/supabase-js";
import type { LedgerEntry } from "@/lib/ledger";

export type SupplierPurchase = {
  id: string;
  doc_date: string;
  doc_number: string;
  total_amount: number | string;
  bill_to_contact_number?: string | null;
  bill_to_email?: string | null;
};

export type SupplierPayment = {
  id: string;
  document_id: string;
  payment_date: string;
  amount: number | string;
  payment_mode: string;
  reference_number: string | null;
};

export function supplierShareKey(supplierName: string) {
  return `supplier:${supplierName.trim()}`;
}

export type SupplierLedger = {
  supplier: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  entries: LedgerEntry[];
  totalPurchased: number;
  totalPaid: number;
  balancePayable: number;
};

export function supplierLedgerRows(
  purchases: SupplierPurchase[],
  payments: SupplierPayment[]
): Pick<
  SupplierLedger,
  "entries" | "totalPurchased" | "totalPaid" | "balancePayable"
> {
  const entries: LedgerEntry[] = [];
  let balance = 0;
  let totalPurchased = 0;
  let totalPaid = 0;
  let i = 0;
  let j = 0;

  while (i < purchases.length || j < payments.length) {
    const purchaseDate = purchases[i]?.doc_date ?? "9999-12-31";
    const paymentDate = payments[j]?.payment_date ?? "9999-12-31";

    if (purchaseDate <= paymentDate && purchases[i]) {
      const purchase = purchases[i];
      const amount = Number(purchase.total_amount);
      balance += amount;
      totalPurchased += amount;
      entries.push({
        date: purchase.doc_date,
        type: "invoice",
        description: purchase.doc_number,
        debit: amount,
        credit: 0,
        balance,
        refId: purchase.id,
      });
      i++;
    } else if (payments[j]) {
      const payment = payments[j];
      const amount = Number(payment.amount);
      balance -= amount;
      totalPaid += amount;
      entries.push({
        date: payment.payment_date,
        type: "payment",
        description: `${payment.payment_mode}${payment.reference_number ? ` (${payment.reference_number})` : ""}`,
        debit: 0,
        credit: amount,
        balance,
        refId: payment.id,
      });
      j++;
    } else {
      break;
    }
  }

  return {
    entries,
    totalPurchased,
    totalPaid,
    balancePayable: Math.round(balance * 100) / 100,
  };
}

export async function buildSupplierLedger(
  sb: SupabaseClient,
  supplierName: string
): Promise<SupplierLedger | null> {
  const name = supplierName.trim();
  if (!name) return null;

  const { data: rows } = await sb
    .from("documents")
    .select(
      "id, doc_date, doc_number, total_amount, bill_to_contact_number, bill_to_email"
    )
    .eq("doc_type", "purchase")
    .eq("bill_to_name", name)
    .neq("status", "cancelled")
    .order("doc_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (!rows?.length) return null;

  const purchases = rows as SupplierPurchase[];
  const documentIds = purchases.map((p) => p.id);

  const { data: paymentRows } = await sb
    .from("purchase_payments")
    .select(
      "id, document_id, payment_date, amount, payment_mode, reference_number"
    )
    .in("document_id", documentIds)
    .order("payment_date", { ascending: true })
    .order("created_at", { ascending: true });

  const latest = [...purchases].reverse();
  let phone =
    latest.find((p) => p.bill_to_contact_number)?.bill_to_contact_number ??
    null;
  let email = latest.find((p) => p.bill_to_email)?.bill_to_email ?? null;

  if (!phone || !email) {
    const { data: supplier } = await sb
      .from("suppliers")
      .select("contact_number, email")
      .eq("name", name)
      .limit(1)
      .maybeSingle();
    phone = phone || supplier?.contact_number || null;
    email = email || supplier?.email || null;
  }

  const ledger = supplierLedgerRows(
    purchases,
    (paymentRows ?? []) as SupplierPayment[]
  );

  return {
    supplier: { name, phone, email },
    ...ledger,
  };
}
