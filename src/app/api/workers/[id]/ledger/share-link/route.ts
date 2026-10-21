import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { signShareToken } from "@/lib/shareLink";
import { buildPublicWorkerLedgerUrl } from "@/lib/appUrl";
import { buildWorkerLedger } from "@/lib/labour";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseServer();
  const ledger = await buildWorkerLedger(sb, id);
  if (!ledger) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  const days = Number(process.env.SHARE_LINK_EXPIRY_DAYS);
  const expiryDays = Number.isFinite(days) && days > 0 ? days : 365;
  const token = await signShareToken(id, expiryDays * 24 * 60 * 60);
  const [exp, sig] = token.split(".");
  const url = buildPublicWorkerLedgerUrl(id, exp, sig, req);

  return NextResponse.json({
    url,
    summary: {
      workerName: ledger.worker.name,
      openingBalance: ledger.worker.opening_balance,
      totalOwed: ledger.totalOwed,
      totalPaid: ledger.totalPaid,
      balanceOwed: ledger.balanceOwed,
    },
  });
}
