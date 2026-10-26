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
    return `https://api.whatsapp.com/send?phone=${normalized}&text=${encoded}`;
  }
  return `https://api.whatsapp.com/send?text=${encoded}`;
}

export function documentShareMessage({
  docTypeLabel,
  docNumber,
  customerName,
  totalAmount,
  pdfUrl,
  website,
}: {
  docTypeLabel: string;
  docNumber: string;
  customerName: string;
  totalAmount: number;
  pdfUrl?: string;
  website?: string;
}) {
  const total = totalAmount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
  return (
    `Dear ${customerName},\n\n` +
    `Please find your ${docTypeLabel} ${docNumber} from National Glass House.\n` +
    `Total: ₹ ${total}\n\n` +
    (pdfUrl ? `View PDF: ${pdfUrl}\n\n` : "") +
    (website ? `${website}\n\n` : "") +
    `Thank you!`
  );
}

export function ledgerShareMessage({
  customerName,
  openingBalance,
  totalInvoiced,
  totalPaid,
  balanceDue,
  pdfUrl,
  website,
}: {
  customerName: string;
  openingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
  pdfUrl?: string;
  website?: string;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const balance = Math.abs(balanceDue);
  return (
    `Dear ${customerName},\n\n` +
    `Here is your account statement from National Glass House.\n\n` +
    `Opening balance: ₹ ${fmt(openingBalance)}\n` +
    `Invoiced: ₹ ${fmt(totalInvoiced)}\n` +
    `Paid: ₹ ${fmt(totalPaid)}\n` +
    `Balance ${balanceDue > 0 ? "due" : "in credit"}: ₹ ${fmt(balance)}\n\n` +
    (pdfUrl ? `View statement: ${pdfUrl}\n\n` : "") +
    (website ? `${website}\n\n` : "") +
    `Thank you!`
  );
}

export function supplierLedgerShareMessage({
  supplierName,
  totalPurchased,
  totalPaid,
  balancePayable,
  pdfUrl,
  website,
}: {
  supplierName: string;
  totalPurchased: number;
  totalPaid: number;
  balancePayable: number;
  pdfUrl?: string;
  website?: string;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const balance = Math.abs(balancePayable);
  return (
    `Dear ${supplierName},\n\n` +
    `Here is your purchase ledger from National Glass House.\n\n` +
    `Purchases: ₹ ${fmt(totalPurchased)}\n` +
    `Paid: ₹ ${fmt(totalPaid)}\n` +
    `Balance ${balancePayable >= 0 ? "payable" : "advance"}: ₹ ${fmt(balance)}\n\n` +
    (pdfUrl ? `View ledger: ${pdfUrl}\n\n` : "") +
    (website ? `${website}\n\n` : "") +
    `Thank you!`
  );
}

export function labourLedgerShareMessage({
  workerName,
  openingBalance,
  totalOwed,
  totalPaid,
  balanceOwed,
  pdfUrl,
  website,
}: {
  workerName: string;
  openingBalance: number;
  totalOwed: number;
  totalPaid: number;
  balanceOwed: number;
  pdfUrl?: string;
  website?: string;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const balance = Math.abs(balanceOwed);
  return (
    `Dear ${workerName},\n\n` +
    `Here is your labour statement from National Glass House.\n\n` +
    `Opening balance: ₹ ${fmt(openingBalance)}\n` +
    `Work done: ₹ ${fmt(totalOwed)}\n` +
    `Paid: ₹ ${fmt(totalPaid)}\n` +
    `Balance ${balanceOwed >= 0 ? "owed to you" : "advance paid"}: ₹ ${fmt(balance)}\n\n` +
    (pdfUrl ? `View statement: ${pdfUrl}\n\n` : "") +
    (website ? `${website}\n\n` : "") +
    `Thank you!`
  );
}
