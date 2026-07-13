import { Document, Page, StyleSheet } from "@react-pdf/renderer";
import PdfInvoicePage from "@/components/PdfInvoicePage";
import type { PdfInvoicePageProps } from "@/components/PdfInvoicePage";

export type PdfDocumentProps = PdfInvoicePageProps;

const pageStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: "Helvetica", color: "#1e293b" },
});

export default function PdfDocument(props: PdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={pageStyles.page}>
        <PdfInvoicePage {...props} />
      </Page>
    </Document>
  );
}
