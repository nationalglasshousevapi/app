import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { readFile } from "fs/promises";
import path from "path";
import { supabaseServer } from "@/lib/supabaseServer";
import { companyDetails } from "@/lib/company";
import PdfDocument from "@/components/PdfDocument";
import { sendInvoiceEmail } from "@/lib/mail";
import { docTypeLabel } from "@/lib/docTypes";

async function companyLogo() {
  try {
    const logo = await readFile(path.join(process.cwd(), "public", "logo.png"));
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();

  const { data: doc, error } = await sb
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !doc) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  if (!doc.bill_to_email) {
    return NextResponse.json(
      { error: "This document has no customer email address. Add an email to the customer's details first." },
      { status: 400 }
    );
  }

  const { data: items } = await sb
    .from("document_items")
    .select("*")
    .eq("document_id", params.id)
    .order("position", { ascending: true });

  const company = companyDetails();
  const logoSrc = await companyLogo();

  const buffer = await renderToBuffer(
    React.createElement(PdfDocument, {
      docType: doc.doc_type,
      docNumber: doc.doc_number,
      docDate: doc.doc_date,
      orderNumber: doc.order_number,
      orderDate: doc.order_date,
      company,
      logoSrc,
      billTo: {
        name: doc.bill_to_name,
        address: doc.bill_to_address,
        contactPerson: doc.bill_to_contact_person,
        contactNumber: doc.bill_to_contact_number,
        email: doc.bill_to_email,
        gst: doc.bill_to_gst,
      },
      shipTo: {
        name: doc.ship_to_name,
        address: doc.ship_to_address,
        contactPerson: doc.ship_to_contact_person,
        contactNumber: doc.ship_to_contact_number,
      },
      items: items ?? [],
      subtotal: Number(doc.subtotal),
      taxType: doc.tax_type,
      taxRate: Number(doc.tax_rate),
      cgstAmount: Number(doc.cgst_amount),
      sgstAmount: Number(doc.sgst_amount),
      igstAmount: Number(doc.igst_amount),
      roundOff: Number(doc.round_off),
      totalAmount: Number(doc.total_amount),
      remarks: doc.remarks,
    }) as any
  );

  const origin = _req.headers.get("origin") || "https://national-glass-house.vercel.app";
  const pdfUrl = `${origin}/api/documents/${params.id}/pdf`;
  const totalFormatted = Number(doc.total_amount).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const customerName = doc.bill_to_name || "Customer";

  try {
    await sendInvoiceEmail({
      to: doc.bill_to_email,
      subject: `${docTypeLabel(doc.doc_type)} ${doc.doc_number} from National Glass House`,
      text:
        `Dear ${customerName},\n\n` +
        `Please find attached your ${docTypeLabel(doc.doc_type)} ${doc.doc_number} from National Glass House.\n\n` +
        `Total: ₹ ${totalFormatted}\n\n` +
        `You can also view it online at: ${pdfUrl}\n\n` +
        `Thank you for your business!\n\n` +
        `National Glass House\n` +
        `${company.phone} | ${company.email}`,
      pdfBuffer: buffer,
      pdfFilename: `${doc.doc_number}.pdf`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Could not send email. Check your SMTP configuration." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
