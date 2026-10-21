import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { readFile } from "fs/promises";
import path from "path";
import { supabaseServer } from "@/lib/supabaseServer";
import { companyDetails } from "@/lib/company";
import LedgerPdf from "@/components/LedgerPdf";
import { buildCustomerLedger } from "@/lib/ledger";

export async function companyLogo() {
  try {
    const logo = await readFile(path.join(process.cwd(), "public", "logo.png"));
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export interface LedgerPdfResult {
  buffer: Buffer;
  customerName: string;
  openingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
}

export async function renderLedgerPdf(
  customerId: string
): Promise<LedgerPdfResult | null> {
  const sb = supabaseServer();
  const ledger = await buildCustomerLedger(sb, customerId);
  if (!ledger.customer) return null;

  const company = companyDetails();
  const logoSrc = await companyLogo();
  const generatedAt = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const buffer = await renderToBuffer(
    React.createElement(LedgerPdf, {
      company,
      logoSrc,
      customerName: ledger.customer.name,
      openingBalance: ledger.customer.opening_balance,
      totalInvoiced: ledger.totalInvoiced,
      totalPaid: ledger.totalPaid,
      balanceDue: ledger.balanceDue,
      entries: ledger.entries,
      generatedAt,
    }) as any
  );

  return {
    buffer,
    customerName: ledger.customer.name,
    openingBalance: ledger.customer.opening_balance,
    totalInvoiced: ledger.totalInvoiced,
    totalPaid: ledger.totalPaid,
    balanceDue: ledger.balanceDue,
  };
}

export async function renderLedgerPdfResponse(
  customerId: string
): Promise<NextResponse> {
  const result = await renderLedgerPdf(customerId);
  if (!result)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filename = `account-statement-${result.customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
