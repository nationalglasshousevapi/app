import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { signShareToken } from "@/lib/shareLink";

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
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/api/public/documents/${params.id}/pdf?exp=${exp}&sig=${sig}`;

  return NextResponse.json({ url });
}
