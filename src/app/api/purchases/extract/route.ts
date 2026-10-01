import { NextRequest, NextResponse } from "next/server";
import { extractPurchaseInvoice, isOcrConfigured } from "@/lib/ocr";
import { checkScanFile, scanMagicOk } from "@/lib/scanFile";

export async function POST(req: NextRequest) {
  if (!isOcrConfigured()) {
    return NextResponse.json(
      {
        error:
          "Invoice scanning is not configured. Add OCR_API_KEY to enable it.",
      },
      { status: 503 }
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
  const result = await extractPurchaseInvoice(
    buffer.toString("base64"),
    check.mime
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 });
  }

  return NextResponse.json({ extracted: result.data });
}
