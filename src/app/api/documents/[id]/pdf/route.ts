import { NextRequest, NextResponse } from "next/server";
import { renderDocumentPdfResponse } from "@/lib/documentPdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return renderDocumentPdfResponse(params.id);
}
