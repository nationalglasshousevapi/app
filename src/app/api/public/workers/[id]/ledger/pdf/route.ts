import { NextRequest, NextResponse } from "next/server";
import { verifyShareToken } from "@/lib/shareLink";
import { renderWorkerLedgerPdfResponse } from "@/lib/workerLedgerPdf";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const exp = req.nextUrl.searchParams.get("exp");
  const sig = req.nextUrl.searchParams.get("sig");
  const ok =
    exp !== null &&
    sig !== null &&
    (await verifyShareToken(id, `${exp}.${sig}`));

  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return renderWorkerLedgerPdfResponse(id);
}
