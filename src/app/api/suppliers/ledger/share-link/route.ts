import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { signShareToken } from "@/lib/shareLink";
import { buildPublicSupplierLedgerUrl } from "@/lib/appUrl";
import { buildSupplierLedger, supplierShareKey } from "@/lib/supplierLedger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const sb = supabaseServer();
  const ledger = await buildSupplierLedger(sb, name);
  if (!ledger) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const days = Number(process.env.SHARE_LINK_EXPIRY_DAYS);
  const expiryDays = Number.isFinite(days) && days > 0 ? days : 365;
  const token = await signShareToken(
    supplierShareKey(ledger.supplier.name),
    expiryDays * 24 * 60 * 60
  );
  const [exp, sig] = token.split(".");
  const url = buildPublicSupplierLedgerUrl(ledger.supplier.name, exp, sig, req);

  return NextResponse.json({
    url,
    summary: {
      supplierName: ledger.supplier.name,
      totalPurchased: ledger.totalPurchased,
      totalPaid: ledger.totalPaid,
      balancePayable: ledger.balancePayable,
    },
  });
}
