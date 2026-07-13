import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();
  const { id } = params;

  // Fetch customer for opening balance
  const { data: customer, error: custError } = await sb
    .from("customers")
    .select("name, opening_balance")
    .eq("id", id)
    .single();

  if (custError) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Fetch invoices for this customer
  const { data: invoices } = await sb
    .from("documents")
    .select("id, doc_date, doc_number, total_amount, status")
    .eq("customer_id", id)
    .eq("doc_type", "invoice")
    .neq("status", "cancelled")
    .order("doc_date", { ascending: true });

  // Fetch payments for this customer
  const { data: payments } = await sb
    .from("payments")
    .select("id, payment_date, amount, payment_mode, reference_number, notes")
    .eq("customer_id", id)
    .order("payment_date", { ascending: true });

  // Build ledger entries sorted by date
  const entries: {
    date: string;
    type: "opening" | "invoice" | "payment";
    description: string;
    debit: number;
    credit: number;
    balance: number;
    refId?: string;
  }[] = [];

  let runningBalance = Number(customer.opening_balance);

  if (runningBalance > 0) {
    entries.push({
      date: "",
      type: "opening",
      description: "Opening Balance",
      debit: runningBalance,
      credit: 0,
      balance: runningBalance,
    });
  }

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
        description: `${inv.doc_number}`,
        debit: amount,
        credit: 0,
        balance: runningBalance,
        refId: inv.id,
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

  return NextResponse.json({
    customerName: customer.name,
    openingBalance: Number(customer.opening_balance),
    totalInvoiced: (invoices ?? []).reduce((s, inv) => s + Number(inv.total_amount), 0),
    totalPaid: (payments ?? []).reduce((s, pay) => s + Number(pay.amount), 0),
    balanceDue: runningBalance,
    entries,
  });
}
