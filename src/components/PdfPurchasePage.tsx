import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CompanyDetails } from "@/lib/company";

const ACCENT = "#046380";
const LIGHT_BG = "#f2f6f7";
const DIVIDER = "#dce3e7";
const BODY = "#1e293b";
const MUTED = "#64748b";

const styles = StyleSheet.create({
  pageContent: { flex: 1, flexDirection: "column" },
  topBar: { height: 3, backgroundColor: ACCENT, marginBottom: 12, borderRadius: 2 },
  headerRow: { flexDirection: "row", marginBottom: 10 },
  brandCol: { width: "55%" },
  logo: { width: 175, height: 52, objectFit: "contain", objectPosition: "left" },
  metaCol: { width: "45%", alignItems: "flex-end" },
  docTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: ACCENT, letterSpacing: 1, textAlign: "right" },
  metaBlock: { marginTop: 6, alignItems: "flex-end" },
  metaLine: { fontSize: 9, color: BODY, lineHeight: 1.6 },
  companyStrip: { flexDirection: "row", backgroundColor: LIGHT_BG, borderRadius: 4, padding: 10, marginBottom: 10 },
  companyCol: { flex: 1 },
  companyName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: ACCENT, marginBottom: 2 },
  companyText: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },
  supplierBox: { padding: 10, borderRadius: 4, backgroundColor: "#fafbfc", borderWidth: 1, borderColor: DIVIDER, marginBottom: 10, minHeight: 60 },
  supplierLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: ACCENT, textTransform: "uppercase", marginBottom: 4 },
  supplierName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BODY, marginBottom: 2 },
  supplierText: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },
  tableWrap: { flexGrow: 1, flexDirection: "column" },
  tableHead: { flexDirection: "row", backgroundColor: ACCENT, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8 },
  headCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#fff" },
  row: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#eef2f4" },
  rowAlt: { backgroundColor: "#f8fafb" },
  cell: { fontSize: 8 },
  colDesc: { width: "34%" },
  colSize: { width: "14%", textAlign: "center" },
  colHsn: { width: "12%", textAlign: "center" },
  colQty: { width: "12%", textAlign: "right" },
  colRate: { width: "14%", textAlign: "right" },
  colAmount: { width: "14%", textAlign: "right" },
  spacer: { flexGrow: 1 },
  summaryRow: { flexDirection: "row" },
  notes: { width: "55%", paddingRight: 12 },
  notesTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: ACCENT, textTransform: "uppercase", marginBottom: 3 },
  notesText: { fontSize: 8, color: MUTED, lineHeight: 1.5 },
  totCol: { width: "45%" },
  totLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  totLabel: { fontSize: 8.5, color: MUTED },
  totValue: { fontSize: 8.5 },
  grandTot: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 8, backgroundColor: LIGHT_BG, borderRadius: 4, marginTop: 2 },
  grandLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: ACCENT },
  grandValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: ACCENT },
  footer: { marginTop: 12, paddingTop: 5, borderTopWidth: 2, borderTopColor: ACCENT, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: MUTED },
});

export type PdfPurchaseItem = {
  description: string;
  size?: string | null;
  hsn_code?: string | null;
  qty: number;
  unit?: string | null;
  rate: number;
  total: number;
};

export type PdfPurchasePageProps = {
  docNumber: string;
  docDate: string;
  company: CompanyDetails;
  supplier: {
    name?: string | null;
    address?: string | null;
    contactPerson?: string | null;
    contactNumber?: string | null;
    gst?: string | null;
  };
  items: PdfPurchaseItem[];
  subtotal: number;
  taxType: string;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  remarks?: string | null;
  logoSrc?: string;
};

function money(v: number) {
  return `₹ ${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fdate(v?: string | null) {
  return v
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(`${v}T00:00:00`),
      )
    : "—";
}

export default function PdfPurchasePage(props: PdfPurchasePageProps) {
  const { company, supplier } = props;
  const taxRows: [string, number][] =
    props.taxType === "cgst_sgst"
      ? [
          [`CGST (${((props.taxRate * 100) / 2).toFixed(1)}%)`, Number(props.cgstAmount)],
          [`SGST (${((props.taxRate * 100) / 2).toFixed(1)}%)`, Number(props.sgstAmount)],
        ]
      : props.taxType === "igst"
        ? [[`IGST (${(props.taxRate * 100).toFixed(1)}%)`, Number(props.igstAmount)]]
        : [];

  return (
    <View style={styles.pageContent}>
      <View style={styles.topBar} />

      <View style={styles.headerRow}>
        <View style={styles.brandCol}>
          {props.logoSrc ? (
            <Image style={styles.logo} src={props.logoSrc} />
          ) : (
            <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: ACCENT }}>
              {company.name}
            </Text>
          )}
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.docTitle}>PURCHASE</Text>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLine}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>No:</Text> {props.docNumber}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Date:</Text> {fdate(props.docDate)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.companyStrip}>
        <View style={styles.companyCol}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyText}>
            {company.address}
            {"\n"}
            {company.phone} | {company.email}
            {"\n"}
            GST: {company.gst}
          </Text>
        </View>
      </View>

      <View style={styles.supplierBox}>
        <Text style={styles.supplierLabel}>Supplier</Text>
        <Text style={styles.supplierName}>{supplier.name || "—"}</Text>
        {supplier.address ? <Text style={styles.supplierText}>{supplier.address}</Text> : null}
        {supplier.contactPerson || supplier.contactNumber ? (
          <Text style={styles.supplierText}>
            Attn: {[supplier.contactPerson, supplier.contactNumber].filter(Boolean).join(" | ")}
          </Text>
        ) : null}
        {supplier.gst ? <Text style={styles.supplierText}>GST: {supplier.gst}</Text> : null}
      </View>

      <View style={styles.tableWrap}>
        <View style={styles.tableHead}>
          <Text style={[styles.headCell, styles.colDesc]}>DESCRIPTION</Text>
          <Text style={[styles.headCell, styles.colSize]}>SIZE</Text>
          <Text style={[styles.headCell, styles.colHsn]}>HSN</Text>
          <Text style={[styles.headCell, styles.colQty]}>QTY</Text>
          <Text style={[styles.headCell, styles.colRate]}>RATE</Text>
          <Text style={[styles.headCell, styles.colAmount]}>AMOUNT</Text>
        </View>
        {props.items.map((item, i) => (
          <View key={`r-${i}`} style={[styles.row, i % 2 ? styles.rowAlt : {}]}>
            <Text style={[styles.cell, styles.colDesc]}>{item.description}</Text>
            <Text style={[styles.cell, styles.colSize]}>{item.size || "—"}</Text>
            <Text style={[styles.cell, styles.colHsn]}>{item.hsn_code || "—"}</Text>
            <Text style={[styles.cell, styles.colQty]}>{item.qty} {item.unit || ""}</Text>
            <Text style={[styles.cell, styles.colRate]}>{money(item.rate)}</Text>
            <Text style={[styles.cell, styles.colAmount]}>{money(item.total)}</Text>
          </View>
        ))}
        <View style={styles.spacer} />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.notes}>
          {props.remarks ? (
            <>
              <Text style={styles.notesTitle}>Remarks</Text>
              <Text style={styles.notesText}>{props.remarks}{"\n"}{"\n"}</Text>
            </>
          ) : null}
          <Text style={styles.notesTitle}>Notes</Text>
          <Text style={styles.notesText}>This is a computer-generated purchase register entry.</Text>
        </View>
        <View style={styles.totCol}>
          <View style={styles.totLine}>
            <Text style={styles.totLabel}>Subtotal</Text>
            <Text style={styles.totValue}>{money(props.subtotal)}</Text>
          </View>
          {taxRows.map(([label, amount]) => (
            <View key={String(label)} style={styles.totLine}>
              <Text style={styles.totLabel}>{label}</Text>
              <Text style={styles.totValue}>{money(amount)}</Text>
            </View>
          ))}
          <View style={styles.grandTot}>
            <Text style={styles.grandLabel}>Total Amount</Text>
            <Text style={styles.grandValue}>{money(props.totalAmount)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>National Glass House — {company.website}</Text>
        <Text style={styles.footerText}>{props.docNumber}</Text>
      </View>
    </View>
  );
}
