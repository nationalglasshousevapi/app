import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createPurchasePaymentSchema, parseError } from "@/lib/schemas";
import { purchasePaymentSummary } from "@/lib/purchasePayments";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createPurchasePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parseError(parsed.error) },
      { status: 400 }
    );
  }
  const input = parsed.data;
  const sb = supabaseServer();

  const { data: doc, error: docError } = await sb
    .from("documents")
    .select("id, doc_type, total_amount, status")
    .eq("id", input.document_id)
    .single();

  if (docError || !doc || doc.doc_type !== "purchase") {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }
  if (doc.status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot record a payment on a cancelled purchase." },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } = await sb
    .from("purchase_payments")
    .select("amount")
    .eq("document_id", input.document_id);

  if (existingError) {
    return NextResponse.json(
      { error: "Could not check the existing payments." },
      { status: 500 }
    );
  }

  const summary = purchasePaymentSummary(doc.total_amount, existing ?? []);
  if (input.amount > summary.balance + 0.005) {
    return NextResponse.json(
      {
        error: `Amount exceeds the balance payable (₹ ${summary.balance.toLocaleString("en-IN")}).`,
      },
      { status: 400 }
    );
  }

  const { data: payment, error } = await sb
    .from("purchase_payments")
    .insert({
      document_id: input.document_id,
      payment_date: input.payment_date ?? new Date().toISOString().slice(0, 10),
      amount: input.amount,
      payment_mode: input.payment_mode,
      reference_number: input.reference_number || null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not save the payment." },
      { status: 500 }
    );
  }

  if (input.amount >= summary.balance - 0.005) {
    await sb
      .from("documents")
      .update({ status: "paid" })
      .eq("id", input.document_id);
  }

  return NextResponse.json({ payment });
}
