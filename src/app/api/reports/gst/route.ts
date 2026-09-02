import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  const trimmed = s.trim();
  const dangerous = /^[=+\-@]/.test(trimmed);
  const safe = dangerous ? `'${s}` : s;
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export async function GET(req: NextRequest) {
  const sb = supabaseServer();

  const month = req.nextUrl.searchParams.get("month") ?? "";
  const reportType = req.nextUrl.searchParams.get("type") ?? "invoice"; // invoice | hsn | purchase | purchase_hsn | summary
  const fromParam = req.nextUrl.searchParams.get("from") ?? "";
  const toParam = req.nextUrl.searchParams.get("to") ?? "";

  const side: "sales" | "purchase" =
    reportType === "purchase" || reportType === "purchase_hsn" || reportType === "summary"
      ? "purchase"
      : "sales";
  // Sales reports cover invoices + orders (cash sales start as orders and only
  // become invoices when converted). GST-registered customers still need an
  // invoice, so this simply includes the paperwork trail.
  const docTypeFilter = side === "sales" ? ["invoice", "order"] : ["purchase"];

  // Build date range: prefer explicit from/to, then month
  let fromDate: string;
  let toDate: string;
  if (fromParam && toParam) {
    fromDate = fromParam;
    toDate = toParam;
  } else if (month) {
    const [y, m] = month.split("-").map(Number);
    fromDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const end = new Date(y, m, 0);
    toDate = `${y}-${String(m).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  } else {
    fromDate = "2000-01-01";
    toDate = "2099-12-31";
  }

  // Fetch all invoices/purchases in range
  let docQuery = sb
    .from("documents")
    .select("id, doc_number, doc_date, bill_to_name, bill_to_gst, bill_to_address, subtotal, tax_type, tax_rate, cgst_amount, sgst_amount, igst_amount, total_amount")
    .in("doc_type", docTypeFilter)
    .gte("doc_date", fromDate)
    .lte("doc_date", toDate)
    .order("doc_date", { ascending: true });
  if (side === "purchase") {
    // Only confirmed entries feed input tax credit claims.
    docQuery = docQuery.neq("status", "draft").neq("status", "cancelled");
  }
  const { data: invoices } = await docQuery;
  // Sales reports: invoices + orders (orders are the pre-invoice cash sale paperwork)

  const reportLabel = fromParam && toParam ? `${fromParam}_${toParam}` : month || "all";

  if (reportType === "summary") {
    const outputTax = (invoices ?? []).reduce(
      (s, d) => s + Number(d.cgst_amount) + Number(d.sgst_amount) + Number(d.igst_amount),
      0,
    );
    const taxableSales = (invoices ?? []).reduce((s, d) => s + Number(d.subtotal), 0);

    let purchaseQuery = sb
      .from("documents")
      .select("id, cgst_amount, sgst_amount, igst_amount, subtotal")
      .eq("doc_type", "purchase")
      .gte("doc_date", fromDate)
      .lte("doc_date", toDate)
      .neq("status", "draft")
      .neq("status", "cancelled");
    const { data: purchases } = await purchaseQuery;
    const inputCredit = (purchases ?? []).reduce(
      (s, d) => s + Number(d.cgst_amount) + Number(d.sgst_amount) + Number(d.igst_amount),
      0,
    );
    const taxablePurchases = (purchases ?? []).reduce((s, d) => s + Number(d.subtotal), 0);

    const label = fromParam && toParam ? `${fromParam} to ${toParam}` : month || "all";    const lines = [
      `GST Summary,${escapeCsv(label)}`,
      "",
      "Metric,Amount (INR)",
      `Total Sales (taxable),${taxableSales.toFixed(2)}`,
      `Output Tax,${outputTax.toFixed(2)}`,
      `Total Purchases (taxable),${taxablePurchases.toFixed(2)}`,
      `Input Tax Credit,${inputCredit.toFixed(2)}`,
      `Net GST Payable,${(outputTax - inputCredit).toFixed(2)}`,
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gst-summary-${reportLabel}.csv"`,
      },
    });
  }

  if (!invoices?.length) {
    return new NextResponse("No documents found for the selected period.", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (reportType === "hsn" || reportType === "purchase_hsn") {
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
        "Content-Disposition": `attachment; filename="gstr1-hsn-${reportLabel}.csv"`,
      },
    });
  }

  // Document-level GST CSV (GSTR-1 for sales / ITC register for purchases)
  const header = side === "sales"
    ? "GSTIN of Recipient,Bill To Name,Invoice Number,Invoice Date,Invoice Value,Taxable Value,CGST Amount,SGST Amount,IGST Amount,Tax Type"
    : "GSTIN of Supplier,Supplier Name,Supplier Invoice Number,Invoice Date,Invoice Value,Taxable Value,CGST Amount,SGST Amount,IGST Amount,Tax Type";
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

  const filenamePrefix =
    reportType === "purchase"
      ? "purchase-gst-"
      : side === "sales" && reportType === "hsn"
        ? "gstr1-hsn-"
        : reportType === "purchase_hsn"
          ? "purchase-hsn-"
          : "gstr1-invoices-";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenamePrefix}${reportLabel}.csv"`,
    },
  });
}
