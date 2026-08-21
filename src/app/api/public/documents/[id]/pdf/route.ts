import { NextRequest, NextResponse } from "next/server";
import { verifyShareToken } from "@/lib/shareLink";
import { renderDocumentPdfResponse } from "@/lib/documentPdf";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const exp = req.nextUrl.searchParams.get("exp");
  const sig = req.nextUrl.searchParams.get("sig");
  const ok =
    exp !== null &&
    sig !== null &&
    (await verifyShareToken(params.id, `${exp}.${sig}`));

  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return renderDocumentPdfResponse(params.id);
}
