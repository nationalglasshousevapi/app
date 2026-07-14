import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { readFile } from "fs/promises";
import path from "path";
import { supabaseServer } from "@/lib/supabaseServer";
import { companyDetails } from "@/lib/company";
import PdfDocument from "@/components/PdfDocument";

export const dynamic = "force-dynamic";

async function companyLogo() {
  try {
    const logo = await readFile(path.join(process.cwd(), "public", "logo.png"));
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch {
    // A missing logo must never prevent a customer from opening an invoice.
    return undefined;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseServer();

  const { data: doc, error } = await sb
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !doc)
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });

  const { data: items } = await sb
    .from("document_items")
    .select("*")
    .eq("document_id", params.id)
    .order("position", { ascending: true });

  const company = companyDetails();
  const logoSrc = await companyLogo();

  const buffer = await renderToBuffer(
    React.createElement(PdfDocument, {
      docType: doc.doc_type,
      docNumber: doc.doc_number,
      docDate: doc.doc_date,
      orderNumber: doc.order_number,
      orderDate: doc.order_date,
      company,
      logoSrc,
      billTo: {
        name: doc.bill_to_name,
        address: doc.bill_to_address,
        contactPerson: doc.bill_to_contact_person,
        contactNumber: doc.bill_to_contact_number,
        email: doc.bill_to_email,
        gst: doc.bill_to_gst,
      },
      shipTo: {
        name: doc.ship_to_name,
        address: doc.ship_to_address,
        contactPerson: doc.ship_to_contact_person,
        contactNumber: doc.ship_to_contact_number,
      },
      items: (items ?? []).map((it) => ({
        description: it.description,
        size: it.size,
        hsn_code: it.hsn_code,
        qty: Number(it.qty),
        unit: it.unit,
        rate: Number(it.rate),
        total: Number(it.total),
        actual_length: Number(it.actual_length || 0),
        actual_width: Number(it.actual_width || 0),
        nos: Number(it.nos || 1),
        calculated_length: Number(it.calculated_length || 0),
        calculated_width: Number(it.calculated_width || 0),
      })),
      subtotal: Number(doc.subtotal),
      discountAmount: Number(doc.discount_amount || 0),
      taxType: doc.tax_type,
      taxRate: Number(doc.tax_rate),
      cgstAmount: Number(doc.cgst_amount),
      sgstAmount: Number(doc.sgst_amount),
      igstAmount: Number(doc.igst_amount),
      roundOff: Number(doc.round_off),
      transportCharges: Number(doc.transport_charges || 0),
      packingForwardingCharges: Number(doc.packing_forwarding_charges || 0),
      totalAmount: Number(doc.total_amount),
      remarks: doc.remarks,
    }) as any
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.doc_number}.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
