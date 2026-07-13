import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import PdfInvoicePage from "@/components/PdfInvoicePage";
import type { CompanyDetails } from "@/lib/company";
import { docTypeLabel } from "@/lib/docTypes";

const ACCENT = "#046380";
const LIGHT_BG = "#f2f6f7";
const DIVIDER = "#dce3e7";
const BODY = "#1e293b";
const MUTED = "#64748b";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: "Helvetica", color: BODY },
  content: { flex: 1, flexDirection: "column" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: ACCENT, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 10, color: MUTED, textAlign: "center", marginBottom: 16 },
  summaryLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: ACCENT, marginBottom: 8, textTransform: "uppercase" },
  // Summary table
  tableHead: { flexDirection: "row", backgroundColor: ACCENT, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8 },
  headCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#fff" },
  row: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#eef2f4" },
  rowAlt: { backgroundColor: "#f8fafb" },
  cell: { fontSize: 8.5 },
  colDate: { width: "15%" },
  colNumber: { width: "25%" },
  colCustomer: { width: "30%" },
  colType: { width: "15%" },
  colAmount: { width: "15%", textAlign: "right" },
  // Grand total
  grandRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, backgroundColor: LIGHT_BG, borderRadius: 4, marginTop: 4 },
  grandLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: ACCENT, textAlign: "right", width: "85%" },
  grandValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: ACCENT, width: "15%", textAlign: "right" },
  // Footer on summary page
  summaryFooter: { marginTop: "auto", paddingTop: 5, borderTopWidth: 2, borderTopColor: ACCENT, flexDirection: "row", justifyContent: "center" },
  summaryFooterText: { fontSize: 7.5, color: MUTED },
  // Invoice page style
  invoicePage: { padding: 24, fontSize: 9, fontFamily: "Helvetica", color: BODY },
});

export type BatchDocument = {
  doc: {
    id: string;
    doc_type: string;
    doc_number: string;
    doc_date: string;
    order_number?: string | null;
    order_date?: string | null;
    bill_to_name?: string | null;
    bill_to_address?: string | null;
    bill_to_contact_person?: string | null;
    bill_to_contact_number?: string | null;
    bill_to_email?: string | null;
    bill_to_gst?: string | null;
    ship_to_name?: string | null;
    ship_to_address?: string | null;
    ship_to_contact_person?: string | null;
    ship_to_contact_number?: string | null;
    tax_type: string;
    tax_rate: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    subtotal: number;
    round_off: number;
    total_amount: number;
    remarks?: string | null;
  };
  items: Array<{
    description: string;
    size?: string | null;
    hsn_code?: string | null;
    qty: number;
    unit?: string | null;
    rate: number;
    total: number;
  }>;
};

export type BatchPdfDocumentProps = {
  documents: BatchDocument[];
  company: CompanyDetails;
  logoSrc?: string;
  title: string;
  totalAmount: number;
  docType: string;
};

function money(v: number) { return `₹ ${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function BatchPdfDocument(props: BatchPdfDocumentProps) {
  const { documents, company, logoSrc, title, totalAmount, docType } = props;
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <Document>
      {/* Summary page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <Text style={styles.title}>{docTypeLabel(docType).toUpperCase()} — {title}</Text>
          <Text style={styles.subtitle}>National Glass House</Text>

          <Text style={styles.summaryLabel}>Summary</Text>

          <View style={styles.tableHead}>
            <Text style={[styles.headCell, styles.colDate]}>DATE</Text>
            <Text style={[styles.headCell, styles.colNumber]}>NUMBER</Text>
            <Text style={[styles.headCell, styles.colCustomer]}>CUSTOMER</Text>
            <Text style={[styles.headCell, styles.colType]}>TYPE</Text>
            <Text style={[styles.headCell, styles.colAmount]}>AMOUNT</Text>
          </View>

          {documents.map((d, i) => {
            const docDate = d.doc.doc_date
              ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${d.doc.doc_date}T00:00:00`))
              : "—";
            return (
              <View key={d.doc.id} style={[styles.row, i % 2 ? styles.rowAlt : {}]}>
                <Text style={[styles.cell, styles.colDate]}>{docDate}</Text>
                <Text style={[styles.cell, styles.colNumber]}>{d.doc.doc_number}</Text>
                <Text style={[styles.cell, styles.colCustomer]}>{d.doc.bill_to_name || "—"}</Text>
                <Text style={[styles.cell, styles.colType]}>{docTypeLabel(d.doc.doc_type)}</Text>
                <Text style={[styles.cell, styles.colAmount]}>{money(Number(d.doc.total_amount))}</Text>
              </View>
            );
          })}

          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{money(totalAmount)}</Text>
          </View>

          <View style={styles.summaryFooter}>
            <Text style={styles.summaryFooterText}>Generated by National Glass House — {documents.length} {docTypeLabel(docType).toLowerCase()}{documents.length !== 1 ? "s" : ""}</Text>
          </View>
        </View>
      </Page>

      {/* Individual invoice pages */}
      {documents.map((d) => (
        <Page key={d.doc.id} size="A4" style={styles.invoicePage}>
          <PdfInvoicePage
            docType={d.doc.doc_type}
            docNumber={d.doc.doc_number}
            docDate={d.doc.doc_date}
            orderNumber={d.doc.order_number}
            orderDate={d.doc.order_date}
            company={company}
            logoSrc={logoSrc}
            billTo={{
              name: d.doc.bill_to_name,
              address: d.doc.bill_to_address,
              contactPerson: d.doc.bill_to_contact_person,
              contactNumber: d.doc.bill_to_contact_number,
              email: d.doc.bill_to_email,
              gst: d.doc.bill_to_gst,
            }}
            shipTo={{
              name: d.doc.ship_to_name,
              address: d.doc.ship_to_address,
              contactPerson: d.doc.ship_to_contact_person,
              contactNumber: d.doc.ship_to_contact_number,
            }}
            items={d.items}
            subtotal={Number(d.doc.subtotal)}
            taxType={d.doc.tax_type}
            taxRate={Number(d.doc.tax_rate)}
            cgstAmount={Number(d.doc.cgst_amount)}
            sgstAmount={Number(d.doc.sgst_amount)}
            igstAmount={Number(d.doc.igst_amount)}
            roundOff={Number(d.doc.round_off)}
            totalAmount={Number(d.doc.total_amount)}
            remarks={d.doc.remarks}
          />
        </Page>
      ))}
    </Document>
  );
}
