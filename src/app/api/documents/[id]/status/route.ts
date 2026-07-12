import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { status: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const validStatuses = ["draft", "sent", "paid", "cancelled"];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `Status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("documents")
    .update({ status: body.status })
    .eq("id", params.id)
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data });
}
