import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import { docTypeLabel } from "@/lib/docTypes";
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
  bankCol: { width: "40%" },
  bankLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: ACCENT, textTransform: "uppercase", marginBottom: 2 },
  bankText: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },
  partiesRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  partyBox: { flex: 1, padding: 10, borderRadius: 4, backgroundColor: "#fafbfc", borderWidth: 1, borderColor: DIVIDER, minHeight: 80 },
  partyLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: ACCENT, textTransform: "uppercase", marginBottom: 4 },
  partyName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BODY, marginBottom: 2 },
  partyText: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },
  tableWrap: { flexGrow: 1, flexDirection: "column" },
  tableHead: { flexDirection: "row", backgroundColor: ACCENT, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8 },
  headCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#fff" },
  row: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#eef2f4" },
  rowAlt: { backgroundColor: "#f8fafb" },
  cell: { fontSize: 8 },
  // Table layout (LxW dimensions for all document types)
  invDesc: { width: "18%" },
  invActualLw: { width: "12%", textAlign: "center" },
  invNos: { width: "8%", textAlign: "center" },
  invCalcLw: { width: "12%", textAlign: "center" },
  invQty: { width: "10%", textAlign: "right" },
  invRate: { width: "12%", textAlign: "right" },
  invUnit: { width: "8%", textAlign: "center" },
  invAmount: { width: "20%", textAlign: "right" },
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

export type PdfInvoiceItem = {
  description: string;
  size?: string | null;
  hsn_code?: string | null;
  qty: number;
  unit?: string | null;
  rate: number;
  total: number;
  actual_length?: number;
  actual_width?: number;
  nos?: number;
  calculated_length?: number;
  calculated_width?: number;
};

export type AdditionalChargePdf = {
  label: string;
  amount: number;
};

export type PdfInvoicePageProps = {
  docType: string; docNumber: string; docDate: string; orderNumber?: string | null; orderDate?: string | null;
  company: CompanyDetails;
  billTo: { name?: string | null; address?: string | null; contactPerson?: string | null; contactNumber?: string | null; email?: string | null; gst?: string | null };
  shipTo: { name?: string | null; address?: string | null; contactPerson?: string | null; contactNumber?: string | null };
  items: PdfInvoiceItem[];
  subtotal: number; discountAmount?: number; taxType: string; taxRate: number; cgstAmount: number; sgstAmount: number; igstAmount: number; roundOff: number; transportCharges?: number; packingForwardingCharges?: number; hardwareCharges?: number; additionalCharges?: AdditionalChargePdf[]; totalAmount: number; remarks?: string | null; logoSrc?: string;
};

function money(v: number) { return `₹ ${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fdate(v?: string | null) { return v ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${v}T00:00:00`)) : "—"; }

export default function PdfInvoicePage(props: PdfInvoicePageProps) {
  const { company, billTo, shipTo, items } = props;
  const taxRows: [string, number][] = props.taxType === "cgst_sgst"
    ? [[`CGST (${((props.taxRate * 100) / 2).toFixed(1)}%)`, Number(props.cgstAmount)], [`SGST (${((props.taxRate * 100) / 2).toFixed(1)}%)`, Number(props.sgstAmount)]]
    : props.taxType === "igst" ? [[`IGST (${(props.taxRate * 100).toFixed(1)}%)`, Number(props.igstAmount)]] : [];
  return (
    <View style={styles.pageContent}>
      {/* Top accent bar */}
      <View style={styles.topBar} />

      {/* Header: logo + document title */}
      <View style={styles.headerRow}>
        <View style={styles.brandCol}>
          {props.logoSrc ? <Image style={styles.logo} src={props.logoSrc} /> : <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: ACCENT }}>{company.name}</Text>}
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.docTitle}>{docTypeLabel(props.docType).toUpperCase()}</Text>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLine}><Text style={{ fontFamily: "Helvetica-Bold" }}>No:</Text> {props.docNumber}</Text>
            <Text style={styles.metaLine}><Text style={{ fontFamily: "Helvetica-Bold" }}>Date:</Text> {fdate(props.docDate)}</Text>
            {props.orderNumber ? <Text style={styles.metaLine}><Text style={{ fontFamily: "Helvetica-Bold" }}>Order:</Text> {props.orderNumber} {props.orderDate ? `(${fdate(props.orderDate)})` : ""}</Text> : null}
          </View>
        </View>
      </View>

      {/* Company info + bank strip */}
      <View style={styles.companyStrip}>
        <View style={styles.companyCol}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyText}>{company.address}{"\n"}{company.phone} | {company.email}{"\n"}GST: {company.gst}</Text>
        </View>
        <View style={styles.bankCol}>
          <Text style={styles.bankLabel}>Bank Details</Text>
          <Text style={styles.bankText}>{company.bankAccountName}{"\n"}{company.bankName}{"\n"}A/c: {company.bankAccountNo}{"\n"}IFSC: {company.bankIfsc}</Text>
        </View>
      </View>

      {/* Bill To / Ship To */}
      <View style={styles.partiesRow}>
        <View style={styles.partyBox}>
          <Text style={styles.partyLabel}>Bill To</Text>
          <Text style={styles.partyName}>{billTo.name || "—"}</Text>
          {billTo.address ? <Text style={styles.partyText}>{billTo.address}</Text> : null}
          {billTo.contactPerson || billTo.contactNumber ? <Text style={styles.partyText}>Attn: {[billTo.contactPerson, billTo.contactNumber].filter(Boolean).join(" | ")}</Text> : null}
          {billTo.gst ? <Text style={styles.partyText}>GST: {billTo.gst}</Text> : null}
        </View>
        <View style={styles.partyBox}>
          <Text style={styles.partyLabel}>Ship To</Text>
          <Text style={styles.partyName}>{shipTo.name || billTo.name || "—"}</Text>
          <Text style={styles.partyText}>{shipTo.address || billTo.address || ""}</Text>
          {shipTo.contactPerson || shipTo.contactNumber ? <Text style={styles.partyText}>Attn: {[shipTo.contactPerson, shipTo.contactNumber].filter(Boolean).join(" | ")}</Text> : null}
        </View>
      </View>

      {/* Items table */}
      <View style={styles.tableWrap}>
        <>
          <View style={styles.tableHead}>
            <Text style={[styles.headCell, styles.invDesc]}>DESCRIPTION</Text>
            <Text style={[styles.headCell, styles.invActualLw]}>ACTUAL L×W</Text>
            <Text style={[styles.headCell, styles.invNos]}>NOS</Text>
            <Text style={[styles.headCell, styles.invCalcLw]}>CALC. L×W</Text>
            <Text style={[styles.headCell, styles.invQty]}>QTY</Text>
            <Text style={[styles.headCell, styles.invRate]}>RATE</Text>
            <Text style={[styles.headCell, styles.invUnit]}>UNIT</Text>
            <Text style={[styles.headCell, styles.invAmount]}>AMOUNT</Text>
          </View>
          {items.map((item, i) => {
            const al = Number(item.actual_length || 0);
            const aw = Number(item.actual_width || 0);
            const cl = Number(item.calculated_length || 0);
            const cw = Number(item.calculated_width || 0);
            return (
              <View key={`r-${i}`} style={[styles.row, i % 2 ? styles.rowAlt : {}]}>
                <Text style={[styles.cell, styles.invDesc]}>{item.description}</Text>
                <Text style={[styles.cell, styles.invActualLw]}>{al > 0 && aw > 0 ? `${al}×${aw}` : "—"}</Text>
                <Text style={[styles.cell, styles.invNos]}>{item.nos || "—"}</Text>
                <Text style={[styles.cell, styles.invCalcLw]}>{cl > 0 && cw > 0 ? `${cl}×${cw}` : "—"}</Text>
                <Text style={[styles.cell, styles.invQty]}>{item.qty}</Text>
                <Text style={[styles.cell, styles.invRate]}>{money(item.rate)}</Text>
                <Text style={[styles.cell, styles.invUnit]}>{item.unit || "—"}</Text>
                <Text style={[styles.cell, styles.invAmount]}>{money(item.total)}</Text>
              </View>
            );
          })}
        </>
        <View style={styles.spacer} />
      </View>

      {/* Notes + Totals */}
      <View style={styles.summaryRow}>
        <View style={styles.notes}>
          {props.remarks ? (
            <>
              <Text style={styles.notesTitle}>Remarks</Text>
              <Text style={styles.notesText}>{props.remarks}{"\n"}{"\n"}</Text>
            </>
          ) : null}
          <Text style={styles.notesTitle}>Terms</Text>
          <Text style={styles.notesText}>{"\u2022"} Subject to Vapi jurisdiction.{"\n"}{"\u2022"} Goods once sold will not be taken back.{"\n"}{"\u2022"} This is a computer-generated document.</Text>
        </View>
        <View style={styles.totCol}>
          <View style={styles.totLine}><Text style={styles.totLabel}>Subtotal</Text><Text style={styles.totValue}>{money(props.subtotal)}</Text></View>
          {Number(props.discountAmount || 0) > 0 ? (
            <View style={styles.totLine}><Text style={styles.totLabel}>Discount</Text><Text style={[styles.totValue, { color: "#dc2626" }]}>{money(-(props.discountAmount || 0))}</Text></View>
          ) : null}
          {taxRows.map(([label, amount]) => (
            <View key={String(label)} style={styles.totLine}><Text style={styles.totLabel}>{label}</Text><Text style={styles.totValue}>{money(amount)}</Text></View>
          ))}
          {Number(props.transportCharges || 0) > 0 ? (
            <View style={styles.totLine}><Text style={styles.totLabel}>Transport</Text><Text style={styles.totValue}>{money(props.transportCharges || 0)}</Text></View>
          ) : null}
          {Number(props.packingForwardingCharges || 0) > 0 ? (
            <View style={styles.totLine}><Text style={styles.totLabel}>Packing &amp; Fwd.</Text><Text style={styles.totValue}>{money(props.packingForwardingCharges || 0)}</Text></View>
          ) : null}
          {Number(props.hardwareCharges || 0) > 0 ? (
            <View style={styles.totLine}><Text style={styles.totLabel}>Hardware</Text><Text style={styles.totValue}>{money(props.hardwareCharges || 0)}</Text></View>
          ) : null}
          {(props.additionalCharges || []).filter(c => c.amount > 0).map((charge, i) => (
            <View key={`ac-${i}`} style={styles.totLine}><Text style={styles.totLabel}>{charge.label}</Text><Text style={styles.totValue}>{money(charge.amount)}</Text></View>
          ))}
          {props.roundOff !== 0 ? (
            <View style={styles.totLine}><Text style={styles.totLabel}>Round Off</Text><Text style={styles.totValue}>{money(props.roundOff)}</Text></View>
          ) : null}
          <View style={styles.grandTot}><Text style={styles.grandLabel}>Total Amount</Text><Text style={styles.grandValue}>{money(props.totalAmount)}</Text></View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Thank you for your business — National Glass House</Text>
        <Text style={styles.footerText}>{props.docNumber}</Text>
      </View>
    </View>
  );
}
