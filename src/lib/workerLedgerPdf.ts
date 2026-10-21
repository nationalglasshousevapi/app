import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { supabaseServer } from "@/lib/supabaseServer";
import { companyDetails } from "@/lib/company";
import LedgerPdf from "@/components/LedgerPdf";
import { buildWorkerLedger } from "@/lib/labour";
import { companyLogo } from "@/lib/ledgerPdf";

export interface WorkerLedgerPdfResult {
  buffer: Buffer;
  workerName: string;
  openingBalance: number;
  totalOwed: number;
  totalPaid: number;
  balanceOwed: number;
}

export async function renderWorkerLedgerPdf(
  workerId: string
): Promise<WorkerLedgerPdfResult | null> {
  const sb = supabaseServer();
  const ledger = await buildWorkerLedger(sb, workerId);
  if (!ledger) return null;

  const company = companyDetails();
  const logoSrc = await companyLogo();
  const generatedAt = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const buffer = await renderToBuffer(
    React.createElement(LedgerPdf, {
      variant: "worker",
      company,
      logoSrc,
      customerName: ledger.worker.name,
      openingBalance: ledger.worker.opening_balance,
      totalInvoiced: ledger.totalOwed,
      totalPaid: ledger.totalPaid,
      balanceDue: ledger.balanceOwed,
      entries: ledger.entries,
      generatedAt,
    }) as any
  );

  return {
    buffer,
    workerName: ledger.worker.name,
    openingBalance: ledger.worker.opening_balance,
    totalOwed: ledger.totalOwed,
    totalPaid: ledger.totalPaid,
    balanceOwed: ledger.balanceOwed,
  };
}

export async function renderWorkerLedgerPdfResponse(
  workerId: string
): Promise<NextResponse> {
  const result = await renderWorkerLedgerPdf(workerId);
  if (!result)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filename = `labour-statement-${result.workerName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

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
