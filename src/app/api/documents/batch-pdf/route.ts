import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { readFile } from "fs/promises";
import path from "path";
import { supabaseServer } from "@/lib/supabaseServer";
import { companyDetails } from "@/lib/company";
import BatchPdfDocument from "@/components/BatchPdfDocument";
import type { BatchDocument } from "@/components/BatchPdfDocument";

export const dynamic = "force-dynamic";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function companyLogo() {
  try {
    const logo = await readFile(path.join(process.cwd(), "public", "logo.png"));
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch {
    return undefined;
  }
}

function periodLabel(year: string, months?: string): string {
  if (!months) return year;
  const list = months.split(",").map(Number).filter((m) => m >= 1 && m <= 12);
  if (list.length === 0) return year;
  if (list.length <= 3) {
    return list.map((m) => MONTH_NAMES[m]).join("–") + " " + year;
  }
  return list.length + " months, " + year;
}

function getDateRange(year: string, months?: string): { from: string; to: string } {
  const y = parseInt(year, 10);
  if (!months) {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  const list = months.split(",").map(Number).filter((m) => m >= 1 && m <= 12);
  if (list.length === 0) {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  const minMonth = Math.min(...list);
  const maxMonth = Math.max(...list);
  const from = `${y}-${String(minMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(y, maxMonth, 0).getDate();
  const to = `${y}-${String(maxMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year");
  const months = searchParams.get("months") ?? undefined;
  const docType = searchParams.get("type");

  if (!year) {
    return NextResponse.json({ error: "year query param is required" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { from, to } = getDateRange(year, months);

  let query = sb
    .from("documents")
    .select("*")
    .gte("doc_date", from)
    .lte("doc_date", to)
    .order("doc_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (docType) query = query.eq("doc_type", docType);

  const { data: docs, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!docs || docs.length === 0) {
    return NextResponse.json({ error: "No documents found for the selected period" }, { status: 404 });
  }

  const docIds = docs.map((d) => d.id);
  const { data: allItems } = await sb
    .from("document_items")
    .select("*")
    .in("document_id", docIds)
    .order("position", { ascending: true });

  const itemsByDocId: Record<string, any[]> = {};
  for (const item of allItems ?? []) {
    (itemsByDocId[item.document_id] ??= []).push(item);
  }

  const batchDocs: BatchDocument[] = docs.map((doc) => ({
    doc,
    items: itemsByDocId[doc.id] ?? [],
  }));

  const totalAmount = docs.reduce((sum, d) => sum + Number(d.total_amount), 0);
  const company = companyDetails();
  const logoSrc = await companyLogo();
  const type = docType || "invoice";
  const title = periodLabel(year, months);

  const buffer = await renderToBuffer(
    React.createElement(BatchPdfDocument, {
      documents: batchDocs,
      company,
      logoSrc,
      title,
      totalAmount,
      docType: type,
    }) as any
  );

  const filename = `${type}s-${title.replace(/[,\s]+/g, "-").toLowerCase()}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
