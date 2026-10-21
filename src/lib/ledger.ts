import type { SupabaseClient } from "@supabase/supabase-js";

export interface LedgerEntry {
  date: string;
  type: "opening" | "invoice" | "payment" | "work";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  refId?: string;
  isOrder?: boolean;
}

export interface CustomerLedger {
  customer: { name: string; opening_balance: number } | null;
  openingAtStart: number;
  entries: LedgerEntry[];
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
  fromDate?: string;
  toDate?: string;
}

export async function buildCustomerLedger(
  sb: SupabaseClient,
  customerId: string,
  fromDate?: string,
  toDate?: string
): Promise<CustomerLedger> {
  const { data: customer } = await sb
    .from("customers")
    .select("name, opening_balance")
    .eq("id", customerId)
    .single();

  if (!customer) {
    return {
      customer: null,
      openingAtStart: 0,
      entries: [],
      totalInvoiced: 0,
      totalPaid: 0,
      balanceDue: 0,
      fromDate,
      toDate,
    };
  }

  // Opening balance before the date range (when a start date is supplied).
  let openingAtStart = Number(customer.opening_balance);
  if (fromDate) {
    const { data: preInvs } = await sb
      .from("documents")
      .select("total_amount")
      .eq("customer_id", customerId)
      .in("doc_type", ["invoice", "order"])
      .neq("status", "cancelled")
      .lt("doc_date", fromDate);

    const { data: prePays } = await sb
      .from("payments")
      .select("amount")
      .eq("customer_id", customerId)
      .lt("payment_date", fromDate);

    const preInvTotal = (preInvs ?? []).reduce(
      (s, inv) => s + Number(inv.total_amount),
      0
    );
    const prePayTotal = (prePays ?? []).reduce(
      (s, p) => s + Number(p.amount),
      0
    );
    openingAtStart = openingAtStart + preInvTotal - prePayTotal;
  }

  // Invoices + orders (filtered by date range if set).
  let invoiceQuery = sb
    .from("documents")
    .select("id, doc_date, doc_number, total_amount, doc_type")
    .eq("customer_id", customerId)
    .in("doc_type", ["invoice", "order"])
    .neq("status", "cancelled");

  if (fromDate) invoiceQuery = invoiceQuery.gte("doc_date", fromDate);
  if (toDate) invoiceQuery = invoiceQuery.lte("doc_date", toDate);

  invoiceQuery = invoiceQuery.order("doc_date", { ascending: true });
  const { data: invoices } = await invoiceQuery;

  // Payments (filtered by date range if set).
  let paymentQuery = sb
    .from("payments")
    .select("id, payment_date, amount, payment_mode, reference_number, notes")
    .eq("customer_id", customerId);

  if (fromDate) paymentQuery = paymentQuery.gte("payment_date", fromDate);
  if (toDate) paymentQuery = paymentQuery.lte("payment_date", toDate);

  paymentQuery = paymentQuery.order("payment_date", { ascending: true });
  const { data: payments } = await paymentQuery;

  // Build ledger entries sorted by date.
  const entries: LedgerEntry[] = [];
  let runningBalance = openingAtStart;

  entries.push({
    date: "",
    type: "opening",
    description: "Opening Balance",
    debit: openingAtStart > 0 ? openingAtStart : 0,
    credit: openingAtStart < 0 ? -openingAtStart : 0,
    balance: openingAtStart,
  });

  let i = 0;
  let j = 0;
  while (i < (invoices?.length ?? 0) || j < (payments?.length ?? 0)) {
    const invDate = invoices?.[i]?.doc_date ?? "9999-12-31";
    const payDate = payments?.[j]?.payment_date ?? "9999-12-31";

    if (invDate <= payDate && invoices?.[i]) {
      const inv = invoices[i];
      const amount = Number(inv.total_amount);
      runningBalance += amount;
      entries.push({
        date: inv.doc_date,
        type: "invoice",
        description: inv.doc_number,
        debit: amount,
        credit: 0,
        balance: runningBalance,
        refId: inv.id,
        isOrder: inv.doc_type === "order",
      });
      i++;
    } else if (payments?.[j]) {
      const pay = payments[j];
      const amount = Number(pay.amount);
      runningBalance -= amount;
      entries.push({
        date: pay.payment_date,
        type: "payment",
        description: `${pay.payment_mode}${pay.reference_number ? ` (${pay.reference_number})` : ""}`,
        debit: 0,
        credit: amount,
        balance: runningBalance,
        refId: pay.id,
      });
      j++;
    } else {
      break;
    }
  }

  const totalInvoiced = (invoices ?? []).reduce(
    (s, inv) => s + Number(inv.total_amount),
    0
  );
  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return {
    customer: {
      name: customer.name,
      opening_balance: Number(customer.opening_balance),
    },
    openingAtStart,
    entries,
    totalInvoiced,
    totalPaid,
    balanceDue: runningBalance,
    fromDate,
    toDate,
  };
}
