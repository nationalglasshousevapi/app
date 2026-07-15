import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CompanyDetails } from "@/lib/company";

const ACCENT = "#046380";
const LIGHT_BG = "#f2f6f7";
const BODY = "#1e293b";
const MUTED = "#64748b";

const styles = StyleSheet.create({
  pageContent: { flex: 1, flexDirection: "column" },
  topBar: { height: 3, backgroundColor: ACCENT, marginBottom: 12, borderRadius: 2 },
  headerRow: { flexDirection: "row", marginBottom: 10 },
  brandCol: { width: "55%" },
  logo: { width: 175, height: 52, objectFit: "contain", objectPosition: "left" },
  metaCol: { width: "45%", alignItems: "flex-end" },
  docTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: ACCENT, letterSpacing: 2, textAlign: "right" },
  metaBlock: { marginTop: 6, alignItems: "flex-end" },
  metaLine: { fontSize: 9, color: BODY, lineHeight: 1.6 },
  companyStrip: { flexDirection: "row", backgroundColor: LIGHT_BG, borderRadius: 4, padding: 10, marginBottom: 12 },
  companyCol: { flex: 1 },
  companyName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: ACCENT, marginBottom: 2 },
  companyText: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },
  bankCol: { width: "40%" },
  bankLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: ACCENT, textTransform: "uppercase", marginBottom: 2 },
  bankText: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },

  receivedFromBox: { padding: 14, borderRadius: 4, borderWidth: 1, borderColor: "#dce3e7", marginBottom: 14 },
  receivedLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: ACCENT, textTransform: "uppercase", marginBottom: 4 },
  receivedName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: BODY, marginBottom: 2 },
  receivedText: { fontSize: 9, color: MUTED, lineHeight: 1.6 },

  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, backgroundColor: LIGHT_BG, borderRadius: 4, marginBottom: 14 },
  amountLabel: { fontSize: 9, color: MUTED },
  amountValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: ACCENT },

  detailsBox: { padding: 14, borderRadius: 4, borderWidth: 1, borderColor: "#dce3e7", marginBottom: 14 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  detailLabel: { fontSize: 9, color: MUTED },
  detailValue: { fontSize: 9, color: BODY, fontFamily: "Helvetica-Bold" },

  remarksBox: { padding: 10, borderRadius: 4, backgroundColor: "#fafbfc", marginBottom: 14 },
  remarksTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: ACCENT, textTransform: "uppercase", marginBottom: 3 },
  remarksText: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },

  footer: { marginTop: "auto", paddingTop: 5, borderTopWidth: 2, borderTopColor: ACCENT, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: MUTED },

  spacer: { flexGrow: 1 },
});

export type PdfReceiptPageProps = {
  docNumber: string;
  docDate: string;
  company: CompanyDetails;
  customerName: string;
  customerAddress?: string | null;
  customerContact?: string | null;
  customerGst?: string | null;
  amount: number;
  paymentMode: string;
  referenceNumber?: string | null;
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

function modeLabel(mode: string) {
  const labels: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer (NEFT/RTGS/IMPS)",
    upi: "UPI",
    cheque: "Cheque",
    adjustment: "Adjustment / Credit Note",
  };
  return labels[mode] ?? mode;
}

export default function PdfReceiptPage(props: PdfReceiptPageProps) {
  return (
    <View style={styles.pageContent}>
      <View style={styles.topBar} />

      <View style={styles.headerRow}>
        <View style={styles.brandCol}>
          {props.logoSrc ? (
            <Image style={styles.logo} src={props.logoSrc} />
          ) : (
            <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: ACCENT }}>
              {props.company.name}
            </Text>
          )}
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.docTitle}>RECEIPT</Text>
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
          <Text style={styles.companyName}>{props.company.name}</Text>
          <Text style={styles.companyText}>
            {props.company.address}
            {"\n"}
            {props.company.phone} | {props.company.email}
            {"\n"}
            GST: {props.company.gst}
          </Text>
        </View>
        <View style={styles.bankCol}>
          <Text style={styles.bankLabel}>Bank Details</Text>
          <Text style={styles.bankText}>
            {props.company.bankAccountName}
            {"\n"}
            {props.company.bankName}
            {"\n"}
            A/c: {props.company.bankAccountNo}
            {"\n"}
            IFSC: {props.company.bankIfsc}
          </Text>
        </View>
      </View>

      <View style={styles.receivedFromBox}>
        <Text style={styles.receivedLabel}>Received From</Text>
        <Text style={styles.receivedName}>{props.customerName}</Text>
        {props.customerAddress && (
          <Text style={styles.receivedText}>{props.customerAddress}</Text>
        )}
        {props.customerContact && (
          <Text style={styles.receivedText}>{props.customerContact}</Text>
        )}
        {props.customerGst && (
          <Text style={styles.receivedText}>GST: {props.customerGst}</Text>
        )}
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Amount Received</Text>
        <Text style={styles.amountValue}>{money(props.amount)}</Text>
      </View>

      <View style={styles.detailsBox}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Mode</Text>
          <Text style={styles.detailValue}>{modeLabel(props.paymentMode)}</Text>
        </View>
        {props.referenceNumber && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference</Text>
            <Text style={styles.detailValue}>{props.referenceNumber}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Date</Text>
          <Text style={styles.detailValue}>{fdate(props.docDate)}</Text>
        </View>
      </View>

      {props.remarks && (
        <View style={styles.remarksBox}>
          <Text style={styles.remarksTitle}>Remarks</Text>
          <Text style={styles.remarksText}>{props.remarks}</Text>
        </View>
      )}

      <View style={styles.spacer} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Thank you for your business — National Glass House
        </Text>
        <Text style={styles.footerText}>{props.docNumber}</Text>
      </View>
    </View>
  );
}
