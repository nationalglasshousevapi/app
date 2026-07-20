import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { docTypeShort, financialYearFor } from "@/lib/docTypes";
import { docTypeSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const docTypeRaw = searchParams.get("doc_type");
  const dateRaw = searchParams.get("doc_date");

  const parsed = docTypeSchema.safeParse(docTypeRaw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid or missing doc_type" }, { status: 400 });
  }

  const docType = parsed.data;
  const docDate = dateRaw ? new Date(dateRaw) : new Date();
  const fy = financialYearFor(docDate);

  const sb = supabaseServer();

  // Peek at the next number without consuming it
  const { data: peekData, error: peekError } = await sb.rpc("peek_document_number", {
    p_doc_type: docType,
    p_financial_year: fy,
  });
  if (peekError) return NextResponse.json({ error: peekError.message }, { status: 500 });

  const nextSeq = (peekData as number) + 1;
  const nextNumber = `${docTypeShort(docType)}-${fy}-${String(nextSeq).padStart(4, "0")}`;

  return NextResponse.json({ next_number: nextNumber, sequence: nextSeq });
}
