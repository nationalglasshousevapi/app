import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { signShareToken } from "@/lib/shareLink";
import { buildPublicPdfUrl } from "@/lib/appUrl";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();
  const { data: doc, error } = await sb
    .from("documents")
    .select("id")
    .eq("id", params.id)
    .single();
  if (error || !doc)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const days = Number(process.env.SHARE_LINK_EXPIRY_DAYS);
  const expiryDays = Number.isFinite(days) && days > 0 ? days : 365;
  const token = await signShareToken(params.id, expiryDays * 24 * 60 * 60);
  const [exp, sig] = token.split(".");
  // IMPORTANT: Use centralized helper for app URL — do not read host headers directly.
  // The helper respects NEXT_PUBLIC_APP_URL / VERCEL_PROJECT_PRODUCTION_URL
  // so share links are always the canonical production URL, not a preview deployment.
  const url = buildPublicPdfUrl(params.id, exp, sig, req);

  return NextResponse.json({ url });
}
