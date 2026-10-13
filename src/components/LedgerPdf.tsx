import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { CompanyDetails } from "@/lib/company";
import type { LedgerEntry } from "@/lib/ledger";

const ACCENT = "#046380";
const LIGHT_BG = "#f2f6f7";
const DIVIDER = "#dce3e7";
const BODY = "#1e293b";
const MUTED = "#64748b";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: "Helvetica", color: BODY },
  topBar: {
    height: 3,
    backgroundColor: ACCENT,
    marginBottom: 12,
    borderRadius: 2,
  },
  headerRow: { flexDirection: "row", marginBottom: 10 },
  brandCol: { width: "55%" },
  logo: {
    width: 175,
    height: 52,
    objectFit: "contain",
    objectPosition: "left",
  },
  metaCol: { width: "45%", alignItems: "flex-end" },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 1,
    textAlign: "right",
  },
  metaBlock: { marginTop: 6, alignItems: "flex-end" },
  metaLine: { fontSize: 9, color: BODY, lineHeight: 1.6 },
  companyStrip: {
    flexDirection: "row",
    backgroundColor: LIGHT_BG,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  companyCol: { flex: 1 },
  companyName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    marginBottom: 2,
  },
  companyText: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },
  partyBox: {
    padding: 10,
    borderRadius: 4,
    backgroundColor: "#fafbfc",
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 10,
  },
  partyLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BODY },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  summaryBox: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    backgroundColor: LIGHT_BG,
  },
  summaryLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  summaryValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BODY },
  tableHead: {
    flexDirection: "row",
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#fff" },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f4",
  },
  rowAlt: { backgroundColor: "#f8fafb" },
  cell: { fontSize: 8 },
  date: { width: "18%" },
  desc: { width: "40%" },
  debit: { width: "14%", textAlign: "right" },
  credit: { width: "14%", textAlign: "right" },
  balance: { width: "14%", textAlign: "right" },
  footer: {
    marginTop: 12,
    paddingTop: 5,
    borderTopWidth: 2,
    borderTopColor: ACCENT,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: MUTED },
});

function money(v: number) {
  return `₹ ${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fdate(v?: string) {
  if (!v) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${v}T00:00:00`));
}

export type LedgerPdfProps = {
  company: CompanyDetails;
  logoSrc?: string;
  customerName: string;
  openingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
  entries: LedgerEntry[];
  generatedAt?: string;
};

export default function LedgerPdf({
  company,
  logoSrc,
  customerName,
  openingBalance,
  totalInvoiced,
  totalPaid,
  balanceDue,
  entries,
  generatedAt,
}: LedgerPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} />

        <View style={styles.headerRow}>
          <View style={styles.brandCol}>
            {logoSrc ? (
              <Image style={styles.logo} src={logoSrc} />
            ) : (
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Helvetica-Bold",
                  color: ACCENT,
                }}
              >
                {company.name}
              </Text>
            )}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.docTitle}>ACCOUNT STATEMENT</Text>
            <View style={styles.metaBlock}>
              {generatedAt ? (
                <Text style={styles.metaLine}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>
                    Generated:
                  </Text>{" "}
                  {generatedAt}
                </Text>
              ) : null}
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
              {"\n"}GST: {company.gst}
            </Text>
          </View>
        </View>

        <View style={styles.partyBox}>
          <Text style={styles.partyLabel}>Customer</Text>
          <Text style={styles.partyName}>{customerName || "—"}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Opening Balance</Text>
            <Text style={styles.summaryValue}>{money(openingBalance)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Invoiced</Text>
            <Text style={styles.summaryValue}>{money(totalInvoiced)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Paid</Text>
            <Text style={styles.summaryValue}>{money(totalPaid)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Balance Due</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: balanceDue > 0 ? "#dc2626" : "#16a34a" },
              ]}
            >
              {money(Math.abs(balanceDue))} {balanceDue > 0 ? "Dr" : "Cr"}
            </Text>
          </View>
        </View>

        <View style={styles.tableHead}>
          <Text style={[styles.headCell, styles.date]}>DATE</Text>
          <Text style={[styles.headCell, styles.desc]}>DESCRIPTION</Text>
          <Text style={[styles.headCell, styles.debit]}>DEBIT</Text>
          <Text style={[styles.headCell, styles.credit]}>CREDIT</Text>
          <Text style={[styles.headCell, styles.balance]}>BALANCE</Text>
        </View>

        {entries.map((entry, i) => (
          <View key={`r-${i}`} style={[styles.row, i % 2 ? styles.rowAlt : {}]}>
            <Text style={[styles.cell, styles.date]}>{fdate(entry.date)}</Text>
            <Text style={[styles.cell, styles.desc]}>{entry.description}</Text>
            <Text style={[styles.cell, styles.debit]}>
              {entry.debit > 0 ? money(entry.debit) : "—"}
            </Text>
            <Text style={[styles.cell, styles.credit]}>
              {entry.credit > 0 ? money(entry.credit) : "—"}
            </Text>
            <Text style={[styles.cell, styles.balance]}>
              {money(Math.abs(entry.balance))} {entry.balance > 0 ? "Dr" : "Cr"}
            </Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            National Glass House — Account Statement
          </Text>
          <Text style={styles.footerText}>{customerName}</Text>
        </View>
      </Page>
    </Document>
  );
}
