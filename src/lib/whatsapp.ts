export function whatsAppShareUrl({
  phone,
  text,
}: {
  phone?: string | null;
  text: string;
}) {
  const encoded = encodeURIComponent(text);
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    const normalized = digits.startsWith("91") ? digits : `91${digits}`;
    return `https://wa.me/${normalized}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export function documentShareMessage({
  docTypeLabel,
  docNumber,
  customerName,
  totalAmount,
  pdfUrl,
}: {
  docTypeLabel: string;
  docNumber: string;
  customerName: string;
  totalAmount: number;
  pdfUrl: string;
}) {
  const total = totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return (
    `Dear ${customerName},\n\n` +
    `Please find your ${docTypeLabel} ${docNumber} from National Glass House.\n` +
    `Total: Rs. ${total}\n\n` +
    `View PDF: ${pdfUrl}\n\n` +
    `Thank you!`
  );
}
