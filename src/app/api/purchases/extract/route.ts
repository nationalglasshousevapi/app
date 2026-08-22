import { NextRequest, NextResponse } from "next/server";
import { extractPurchaseInvoice, isOcrConfigured } from "@/lib/ocr";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function POST(req: NextRequest) {
  if (!isOcrConfigured()) {
    return NextResponse.json(
      { error: "Invoice scanning is not configured. Add OCR_API_KEY to enable it." },
      { status: 503 },
    );
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
  const mimeType = (file.type || "image/jpeg").toLowerCase();
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: "Please upload a photo of the invoice (JPG, PNG or WebP). PDF is not supported yet." },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await extractPurchaseInvoice(buffer.toString("base64"), mimeType);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 });
  }

  return NextResponse.json({ extracted: result.data });
}
