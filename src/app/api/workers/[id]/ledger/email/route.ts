import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendInvoiceEmail } from "@/lib/mail";
import { companyDetails } from "@/lib/company";
import { renderWorkerLedgerPdf } from "@/lib/workerLedgerPdf";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseServer();

  const { data: worker } = await sb
    .from("workers")
    .select("email")
    .eq("id", id)
    .single();

  if (!worker) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }
  if (!worker.email) {
    return NextResponse.json(
      {
        error:
          "This worker has no email address. Add an email to the worker's details first.",
      },
      { status: 400 }
    );
  }

  const result = await renderWorkerLedgerPdf(id);
  if (!result) {
    return NextResponse.json(
      { error: "Could not generate the labour statement." },
      { status: 500 }
    );
  }

  const company = companyDetails();
  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const balance = Math.abs(result.balanceOwed);

  const text =
    `Dear ${result.workerName},\n\n` +
    `Please find attached your labour statement from National Glass House.\n\n` +
    `Opening balance: ₹ ${fmt(result.openingBalance)}\n` +
    `Work done: ₹ ${fmt(result.totalOwed)}\n` +
    `Paid: ₹ ${fmt(result.totalPaid)}\n` +
    `Balance ${result.balanceOwed >= 0 ? "owed to you" : "advance paid"}: ₹ ${fmt(balance)}\n\n` +
    `National Glass House\n` +
    `${company.phone} | ${company.email}`;

  try {
    await sendInvoiceEmail({
      to: worker.email,
      subject: "Labour statement from National Glass House",
      text,
      pdfBuffer: result.buffer,
      pdfFilename: "labour-statement.pdf",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Could not send email. Check your SMTP configuration.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
