import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseItems } from "@/lib/documents";
import { DocumentServiceError, createDocumentRecord } from "@/lib/documentService";
import { createDocumentSchema, parseError } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid save request." }, { status: 400 });
  }

  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parseError(parsed.error) }, { status: 400 });
  }

  const { doc_type, doc_number: userDocNumber, doc_date, items: rawItems, ...rest } = parsed.data;
  const sb = supabaseServer();

  try {
    const { document } = await createDocumentRecord(sb, {
      doc_type,
      doc_number: userDocNumber || undefined,
      doc_date: doc_date ? new Date(doc_date) : new Date(),
      order_number: rest.order_number,
      order_date: rest.order_date,
      customer_id: rest.customer_id,
      bill_to: {
        name: rest.bill_to_name,
        address: rest.bill_to_address,
        contactPerson: rest.bill_to_contact_person,
        contactNumber: rest.bill_to_contact_number,
        email: rest.bill_to_email,
        gst: rest.bill_to_gst,
      },
      ship_to: {
        name: rest.ship_to_name || rest.bill_to_name,
        address: rest.ship_to_address || rest.bill_to_address,
        contactPerson: rest.ship_to_contact_person,
        contactNumber: rest.ship_to_contact_number,
      },
      tax_type: rest.tax_type,
      tax_rate: rest.tax_rate,
      discount_amount: rest.discount_amount,
      additional_charges: rest.additional_charges,
      taxable_charges: rest.taxable_charges,
      remarks: rest.remarks,
      status: rest.status,
      items: parseItems(rawItems),
    });
    return NextResponse.json({ document });
  } catch (err) {
    const message = err instanceof DocumentServiceError ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
