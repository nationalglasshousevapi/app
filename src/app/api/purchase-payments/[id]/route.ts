import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();

  const { data: payment, error: lookupError } = await sb
    .from("purchase_payments")
    .select("id, document_id")
    .eq("id", params.id)
    .single();

  if (lookupError || !payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const { error } = await sb
    .from("purchase_payments")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "Could not delete the payment." },
      { status: 500 }
    );
  }

  const { data: doc } = await sb
    .from("documents")
    .select("total_amount, status")
    .eq("id", payment.document_id)
    .single();
  const { data: remaining } = await sb
    .from("purchase_payments")
    .select("amount")
    .eq("document_id", payment.document_id);

  if (doc?.status === "paid") {
    const paid = (remaining ?? []).reduce(
      (sum, row) => sum + Number(row.amount),
      0
    );
    if (paid < Number(doc.total_amount) - 0.005) {
      await sb
        .from("documents")
        .update({ status: "draft" })
        .eq("id", payment.document_id);
    }
  }

  return NextResponse.json({ ok: true });
}
