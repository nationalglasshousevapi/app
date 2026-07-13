import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();
  const { id } = params;

  const { data: customer, error: custError } = await sb
    .from("customers")
    .select("name, opening_balance")
    .eq("id", id)
    .single();

  if (custError) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const { data: invoices } = await sb
    .from("documents")
    .select("total_amount")
    .eq("customer_id", id)
    .eq("doc_type", "invoice")
    .neq("status", "cancelled");

  const { data: payments } = await sb
    .from("payments")
    .select("amount, payment_date")
    .eq("customer_id", id)
    .order("payment_date", { ascending: false });

  const totalInvoiced = (invoices ?? []).reduce((s, inv) => s + Number(inv.total_amount), 0);
  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const lastPayment = payments?.[0];

  return NextResponse.json({
    customerName: customer.name,
    openingBalance: Number(customer.opening_balance),
    totalInvoiced,
    totalPaid,
    balanceDue: Number(customer.opening_balance) + totalInvoiced - totalPaid,
    lastPaymentDate: lastPayment?.payment_date ?? null,
  });
}
