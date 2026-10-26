import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { supabaseServer } from "@/lib/supabaseServer";
import { companyDetails } from "@/lib/company";
import LedgerPdf from "@/components/LedgerPdf";
import { buildSupplierLedger } from "@/lib/supplierLedger";
import { companyLogo } from "@/lib/ledgerPdf";

export interface SupplierLedgerPdfResult {
  buffer: Buffer;
  supplierName: string;
  supplierEmail: string | null;
  totalPurchased: number;
  totalPaid: number;
  balancePayable: number;
}

export async function renderSupplierLedgerPdf(
  supplierName: string
): Promise<SupplierLedgerPdfResult | null> {
  const sb = supabaseServer();
  const ledger = await buildSupplierLedger(sb, supplierName);
  if (!ledger) return null;

  const company = companyDetails();
  const logoSrc = await companyLogo();
  const generatedAt = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const buffer = await renderToBuffer(
    React.createElement(LedgerPdf, {
      variant: "supplier",
      company,
      logoSrc,
      customerName: ledger.supplier.name,
      openingBalance: 0,
      totalInvoiced: ledger.totalPurchased,
      totalPaid: ledger.totalPaid,
      balanceDue: ledger.balancePayable,
      entries: ledger.entries,
      generatedAt,
    }) as any
  );

  return {
    buffer,
    supplierName: ledger.supplier.name,
    supplierEmail: ledger.supplier.email,
    totalPurchased: ledger.totalPurchased,
    totalPaid: ledger.totalPaid,
    balancePayable: ledger.balancePayable,
  };
}

export async function renderSupplierLedgerPdfResponse(
  supplierName: string
): Promise<NextResponse> {
  const result = await renderSupplierLedgerPdf(supplierName);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filename = `purchase-statement-${result.supplierName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}.pdf`;

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
