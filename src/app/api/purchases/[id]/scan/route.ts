import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkScanFile, SCAN_MIME_EXT, scanMagicOk } from "@/lib/scanFile";

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
  const check = checkScanFile(file.type, file.size);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!scanMagicOk(buffer, check.mime)) {
    return NextResponse.json(
      {
        error:
          "This file looks corrupt or mislabelled. Please re-upload the original photo or PDF.",
      },
      { status: 415 }
    );
  }
  const path = `${params.id}/original.${check.ext}`;
  const { error: uploadError } = await sb.storage
    .from("purchase-scans")
    .upload(path, buffer, { contentType: check.mime, upsert: true });

  if (uploadError) {
    return NextResponse.json(
      { error: `Could not store scan: ${uploadError.message}` },
      { status: 500 }
    );
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

  const { data: files } = await sb.storage
    .from("purchase-scans")
    .list(params.id, {
      limit: 1,
      search: "original",
    });
  const name = files?.find((f) => f.name.startsWith("original."))?.name;
  if (!name) {
    return NextResponse.json(
      { error: "No scan stored for this purchase." },
      { status: 404 }
    );
  }

  const { data: blob, error } = await sb.storage
    .from("purchase-scans")
    .download(`${params.id}/${name}`);
  if (error || !blob) {
    return NextResponse.json(
      { error: error?.message ?? "Could not read scan." },
      { status: 500 }
    );
  }

  const arrayBuffer = await blob.arrayBuffer();
  const ext = name.split(".").pop() ?? "";
  const contentType =
    Object.entries(SCAN_MIME_EXT).find(([, e]) => e === ext)?.[0] ??
    "application/octet-stream";

  return new NextResponse(new Uint8Array(arrayBuffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
