import { NextRequest, NextResponse } from "next/server";
import { sendInvoiceEmail } from "@/lib/mail";
import { companyDetails } from "@/lib/company";
import { renderSupplierLedgerPdf } from "@/lib/supplierLedgerPdf";

export async function POST(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  if (!name.trim()) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const result = await renderSupplierLedgerPdf(name);
  if (!result) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }
  if (!result.supplierEmail) {
    return NextResponse.json(
      {
        error:
          "This supplier has no email address. Add the supplier email on a purchase first.",
      },
      { status: 400 }
    );
  }

  const company = companyDetails();
  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const balance = Math.abs(result.balancePayable);

  const text =
    `Dear ${result.supplierName},\n\n` +
    `Please find attached your purchase ledger from National Glass House.\n\n` +
    `Purchases: ₹ ${fmt(result.totalPurchased)}\n` +
    `Paid: ₹ ${fmt(result.totalPaid)}\n` +
    `Balance ${result.balancePayable >= 0 ? "payable" : "advance"}: ₹ ${fmt(balance)}\n\n` +
    `National Glass House\n` +
    `${company.phone} | ${company.email}`;

  try {
    await sendInvoiceEmail({
      to: result.supplierEmail,
      subject: "Purchase ledger from National Glass House",
      text,
      pdfBuffer: result.buffer,
      pdfFilename: "purchase-ledger.pdf",
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
