import { NextRequest, NextResponse } from "next/server";
import { Document, Page, renderToBuffer, StyleSheet } from "@react-pdf/renderer";
import React from "react";
import { readFile } from "fs/promises";
import path from "path";
import { supabaseServer } from "@/lib/supabaseServer";
import { companyDetails } from "@/lib/company";
import PdfPurchasePage from "@/components/PdfPurchasePage";

export const dynamic = "force-dynamic";

const pageStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: "Helvetica", color: "#1e293b" },
});

async function companyLogo() {
  try {
    const logo = await readFile(path.join(process.cwd(), "public", "logo.png"));
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch {
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
  if (error || !doc || doc.doc_type !== "purchase") {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  const { data: items } = await sb
    .from("document_items")
    .select("*")
    .eq("document_id", params.id)
    .order("position", { ascending: true });

  const company = companyDetails();
  const logoSrc = await companyLogo();

  const buffer = await renderToBuffer(
    React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: pageStyles.page },
        React.createElement(PdfPurchasePage, {
          docNumber: doc.doc_number,
          docDate: doc.doc_date,
          company,
          logoSrc,
          supplier: {
            name: doc.bill_to_name ?? "",
            address: doc.bill_to_address,
            contactPerson: doc.bill_to_contact_person,
            contactNumber: doc.bill_to_contact_number,
            gst: doc.bill_to_gst,
            placeOfSupply: doc.place_of_supply,
          },
          irn: doc.irn,
          ackNumber: doc.ack_number,
          ackDate: doc.ack_date,
          biltyNumber: doc.bilty_number,
          vehicleNumber: doc.vehicle_number,
          items: (items ?? []).map((it) => ({
            description: it.description,
            size: it.size,
            hsn_code: it.hsn_code,
            qty: Number(it.qty),
            unit: it.unit,
            rate: Number(it.rate),
            total: Number(it.total),
            thickness: it.thickness != null ? Number(it.thickness) : null,
            width_mm: it.width_mm != null ? Number(it.width_mm) : null,
            length_mm: it.length_mm != null ? Number(it.length_mm) : null,
          })),
          subtotal: Number(doc.subtotal),
          taxType: doc.tax_type,
          taxRate: Number(doc.tax_rate),
          cgstAmount: Number(doc.cgst_amount),
          sgstAmount: Number(doc.sgst_amount),
          igstAmount: Number(doc.igst_amount),
          totalAmount: Number(doc.total_amount),
          remarks: doc.remarks,
        }),
      ),
    ),
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
