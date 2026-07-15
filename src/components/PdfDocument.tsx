import { Document, Page, StyleSheet } from "@react-pdf/renderer";
import PdfInvoicePage from "@/components/PdfInvoicePage";
import PdfReceiptPage from "@/components/PdfReceiptPage";
import type { PdfInvoicePageProps } from "@/components/PdfInvoicePage";

export type PdfDocumentProps = PdfInvoicePageProps;

const pageStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: "Helvetica", color: "#1e293b" },
});

export default function PdfDocument(props: PdfDocumentProps) {
  if (props.docType === "receipt") {
    const pm = (props.remarks ?? "")
      .replace(/^Payment via\s*/i, "")
      .replace(/\s*\(.+\)/, "")
      .trim();
    const refMatch = (props.remarks ?? "").match(/\((.+)\)/);
    const ref = refMatch ? refMatch[1] : null;

    return (
      <Document>
        <Page size="A4" style={pageStyles.page}>
          <PdfReceiptPage
            docNumber={props.docNumber}
            docDate={props.docDate}
            company={props.company}
            customerName={props.billTo?.name ?? ""}
            customerAddress={props.billTo?.address ?? null}
            customerContact={props.billTo?.contactNumber ?? null}
            customerGst={props.billTo?.gst ?? null}
            amount={props.totalAmount}
            paymentMode={pm || "Payment"}
            referenceNumber={ref}
            remarks={props.remarks ?? null}
            logoSrc={props.logoSrc}
          />
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={pageStyles.page}>
        <PdfInvoicePage {...props} />
      </Page>
    </Document>
  );
}
