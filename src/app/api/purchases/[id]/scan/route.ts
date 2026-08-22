import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();

  const { data: doc } = await sb
    .from("documents")
    .select("id, doc_type")
    .eq("id", params.id)
    .single();
  if (!doc || doc.doc_type !== "purchase") {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 10 MB)." }, { status: 413 });
  }
  const mime = (file.type || "").toLowerCase();
  const ext = ALLOWED[mime];
  if (!ext) {
    return NextResponse.json({ error: "Only JPG, PNG or WebP images are supported." }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${params.id}/original.${ext}`;
  const { error: uploadError } = await sb.storage
    .from("purchase-scans")
    .upload(path, buffer, { contentType: mime, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `Could not store scan: ${uploadError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();

  const { data: doc } = await sb
    .from("documents")
    .select("id, doc_type")
    .eq("id", params.id)
    .single();
  if (!doc || doc.doc_type !== "purchase") {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  const { data: files } = await sb.storage.from("purchase-scans").list(params.id, {
    limit: 1,
    search: "original",
  });
  const name = files?.find((f) => f.name.startsWith("original."))?.name;
  if (!name) {
    return NextResponse.json({ error: "No scan stored for this purchase." }, { status: 404 });
  }

  const { data: blob, error } = await sb.storage
    .from("purchase-scans")
    .download(`${params.id}/${name}`);
  if (error || !blob) {
    return NextResponse.json({ error: error?.message ?? "Could not read scan." }, { status: 500 });
  }

  const arrayBuffer = await blob.arrayBuffer();
  const contentType = name.endsWith("png")
    ? "image/png"
    : name.endsWith("webp")
      ? "image/webp"
      : name.endsWith("heic")
        ? "image/heic"
        : name.endsWith("heif")
          ? "image/heif"
          : "image/jpeg";

  return new NextResponse(new Uint8Array(arrayBuffer), {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
  });
}
