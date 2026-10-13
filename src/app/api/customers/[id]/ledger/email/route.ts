import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendInvoiceEmail } from "@/lib/mail";
import { companyDetails } from "@/lib/company";
import { renderLedgerPdf } from "@/lib/ledgerPdf";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();

  const { data: customer } = await sb
    .from("customers")
    .select("email")
    .eq("id", params.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  if (!customer.email) {
    return NextResponse.json(
      {
        error:
          "This customer has no email address. Add an email to the customer's details first.",
      },
      { status: 400 }
    );
  }

  const result = await renderLedgerPdf(params.id);
  if (!result) {
    return NextResponse.json(
      { error: "Could not generate the ledger statement." },
      { status: 500 }
    );
  }

  const company = companyDetails();
  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const balance = Math.abs(result.balanceDue);

  const text =
    `Dear ${result.customerName},\n\n` +
    `Please find attached your account statement from National Glass House.\n\n` +
    `Opening balance: ₹ ${fmt(result.openingBalance)}\n` +
    `Invoiced: ₹ ${fmt(result.totalInvoiced)}\n` +
    `Paid: ₹ ${fmt(result.totalPaid)}\n` +
    `Balance ${result.balanceDue > 0 ? "due" : "in credit"}: ₹ ${fmt(balance)}\n\n` +
    `Thank you for your business!\n\n` +
    `National Glass House\n` +
    `${company.phone} | ${company.email}`;

  try {
    await sendInvoiceEmail({
      to: customer.email,
      subject: "Account statement from National Glass House",
      text,
      pdfBuffer: result.buffer,
      pdfFilename: "account-statement.pdf",
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
