import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const sb = supabaseServer();

  const month = req.nextUrl.searchParams.get("month") ?? "";
  const reportType = req.nextUrl.searchParams.get("type") ?? "invoice"; // invoice | hsn

  // Build date range from month (YYYY-MM)
  let fromDate: string;
  let toDate: string;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    fromDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const end = new Date(y, m, 0);
    toDate = `${y}-${String(m).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  } else {
    fromDate = "2000-01-01";
    toDate = "2099-12-31";
  }

  // Fetch all invoices in range with bill_to GST
  const { data: invoices } = await sb
    .from("documents")
    .select("id, doc_number, doc_date, bill_to_name, bill_to_gst, bill_to_address, subtotal, tax_type, tax_rate, cgst_amount, sgst_amount, igst_amount, total_amount")
    .eq("doc_type", "invoice")
    .gte("doc_date", fromDate)
    .lte("doc_date", toDate)
    .order("doc_date", { ascending: true });

  if (!invoices?.length) {
    return new NextResponse("No invoices found for the selected period.", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (reportType === "hsn") {
    // Fetch line items for all invoices
    const ids = invoices.map((inv) => inv.id);
    const { data: items } = await sb
      .from("document_items")
      .select("document_id, description, size, hsn_code, qty, unit, rate, total")
      .in("document_id", ids)
      .order("position", { ascending: true });

    // Group by HSN code
    const hsnMap = new Map<
      string,
      {
        description: string;
        uqc: string;
        qty: number;
        taxableValue: number;
        taxRate: number;
        cgst: number;
        sgst: number;
        igst: number;
      }
    >();

    const invMap = new Map(invoices.map((inv) => [inv.id, inv]));

    for (const item of items ?? []) {
      const inv = invMap.get(item.document_id);
      if (!inv) continue;
      const hsn = item.hsn_code || "0000";
      const taxable = Number(item.total) ?? 0;
      const taxType = inv.tax_type;
      const taxRate = Number(inv.tax_rate);

      const existing = hsnMap.get(hsn) ?? {
        description: item.description || "",
        uqc: item.unit || "NOS",
        qty: 0,
        taxableValue: 0,
        taxRate: taxRate * 100, // convert to percentage
        cgst: 0,
        sgst: 0,
        igst: 0,
      };

      existing.qty += Number(item.qty) ?? 0;
      existing.taxableValue += taxable;

      const halfRate = (taxRate / 2) * 100;
      if (taxType === "cgst_sgst") {
        existing.cgst += taxable * halfRate;
        existing.sgst += taxable * halfRate;
      } else if (taxType === "igst") {
        existing.igst += taxable * (taxRate * 100);
      }

      hsnMap.set(hsn, existing);
    }

    // Generate HSN-wise CSV
    const header = "HSN,UQC,Total Quantity,Taxable Value,Tax Rate (%),CGST Amount,SGST Amount,IGST Amount";
    const rows = Array.from(hsnMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hsn, data]) =>
        [
          escapeCsv(hsn),
          escapeCsv(data.uqc),
          escapeCsv(data.qty.toFixed(3)),
          escapeCsv(data.taxableValue.toFixed(2)),
          escapeCsv(data.taxRate.toFixed(2)),
          escapeCsv(data.cgst.toFixed(2)),
          escapeCsv(data.sgst.toFixed(2)),
          escapeCsv(data.igst.toFixed(2)),
        ].join(",")
      );

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gstr1-hsn-${month || "all"}.csv"`,
      },
    });
  }

  // Invoice-level GSTR-1
  const header = "GSTIN of Recipient,Bill To Name,Invoice Number,Invoice Date,Invoice Value,Taxable Value,CGST Amount,SGST Amount,IGST Amount,Tax Type";
  const rows = (invoices ?? []).map((inv) =>
    [
      escapeCsv(inv.bill_to_gst),
      escapeCsv(inv.bill_to_name),
      escapeCsv(inv.doc_number),
      escapeCsv(inv.doc_date),
      escapeCsv(Number(inv.total_amount).toFixed(2)),
      escapeCsv(Number(inv.subtotal).toFixed(2)),
      escapeCsv(Number(inv.cgst_amount).toFixed(2)),
      escapeCsv(Number(inv.sgst_amount).toFixed(2)),
      escapeCsv(Number(inv.igst_amount).toFixed(2)),
      escapeCsv(inv.tax_type),
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gstr1-invoices-${month || "all"}.csv"`,
    },
  });
}
