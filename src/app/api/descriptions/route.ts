import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("descriptions")
    .select("id, description")
    .order("description", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ descriptions: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const description = (body.description ?? "").trim();
  if (!description) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("descriptions")
    .insert({ description })
    .select("id, description")
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Description already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ description: data });
}
