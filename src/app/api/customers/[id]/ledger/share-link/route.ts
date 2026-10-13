import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { signShareToken } from "@/lib/shareLink";
import { buildPublicLedgerUrl } from "@/lib/appUrl";
import { buildCustomerLedger } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();
  const ledger = await buildCustomerLedger(sb, params.id);
  if (!ledger.customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const days = Number(process.env.SHARE_LINK_EXPIRY_DAYS);
  const expiryDays = Number.isFinite(days) && days > 0 ? days : 365;
  const token = await signShareToken(params.id, expiryDays * 24 * 60 * 60);
  const [exp, sig] = token.split(".");
  const url = buildPublicLedgerUrl(params.id, exp, sig, req);

  return NextResponse.json({
    url,
    summary: {
      customerName: ledger.customer.name,
      openingBalance: ledger.customer.opening_balance,
      totalInvoiced: ledger.totalInvoiced,
      totalPaid: ledger.totalPaid,
      balanceDue: ledger.balanceDue,
    },
  });
}
