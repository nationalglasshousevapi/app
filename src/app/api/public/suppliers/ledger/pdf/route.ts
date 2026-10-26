import { NextRequest, NextResponse } from "next/server";
import { verifyShareToken } from "@/lib/shareLink";
import { renderSupplierLedgerPdfResponse } from "@/lib/supplierLedgerPdf";
import { supplierShareKey } from "@/lib/supplierLedger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const exp = req.nextUrl.searchParams.get("exp");
  const sig = req.nextUrl.searchParams.get("sig");
  const ok =
    exp !== null &&
    sig !== null &&
    (await verifyShareToken(supplierShareKey(name), `${exp}.${sig}`));

  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return renderSupplierLedgerPdfResponse(name);
}
