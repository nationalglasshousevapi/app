"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import { ledgerShareMessage, whatsAppShareUrl } from "@/lib/whatsapp";
import { publicWebsiteUrl } from "@/lib/website";

interface LedgerSummary {
  customerName: string;
  openingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
}

export default function LedgerShareActions({
  customerId,
  customerName,
  contactNumber,
}: {
  customerId: string;
  customerName: string;
  contactNumber?: string | null;
}) {
  const [sharing, setSharing] = useState(false);
  const [emailing, setEmailing] = useState(false);

  async function fetchShareLink(): Promise<{
    url: string;
    summary: LedgerSummary;
  } | null> {
    try {
      const res = await fetch(
        `/api/customers/${customerId}/ledger/share-link`,
        { method: "POST" }
      );
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function shareWhatsApp() {
    if (sharing) return;
    setSharing(true);
    try {
      const data = await fetchShareLink();
      if (!data) {
        toast.error("Could not generate the ledger link. Please try again.");
        return;
      }
      const website = publicWebsiteUrl();
      const text = ledgerShareMessage({
        customerName: data.summary.customerName || customerName || "Customer",
        openingBalance: data.summary.openingBalance,
        totalInvoiced: data.summary.totalInvoiced,
        totalPaid: data.summary.totalPaid,
        balanceDue: data.summary.balanceDue,
        pdfUrl: data.url,
        website,
      });
      window.open(whatsAppShareUrl({ phone: contactNumber, text }), "_blank");
    } finally {
      setSharing(false);
    }
  }

  async function sendEmail() {
    if (emailing) return;
    setEmailing(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/ledger/email`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Account statement sent to customer's email.");
      } else {
        toast.error(json.error || "Could not send email.");
      }
    } catch {
      toast.error("Could not send email. Check your connection.");
    } finally {
      setEmailing(false);
    }
  }

  const btn =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={shareWhatsApp}
        disabled={sharing}
        className={`${btn} text-emerald-700 border border-emerald-200 bg-white hover:bg-emerald-50`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path d="M10 1.5C5.58 1.5 2 5.08 2 9.5c0 1.88.63 3.62 1.69 5L2.5 18.5l4.24-1.08A8 8 0 0010 17.5c4.42 0 8-3.58 8-8s-3.58-8-8-8zm3.68 11.1c-.15.43-.88.82-1.46.82-1.4 0-3.57-.97-4.7-2.04C5.65 9.6 5.06 8.23 5 7.55c0-.58.43-.95.66-1.12.12-.09.26-.14.35-.14s.18 0 .25.01c.08.01.18-.03.28.26.1.28.36.98.39 1.05.04.07.06.15.02.24-.04.09-.06.13-.14.22-.07.09-.16.19-.23.27-.06.08-.14.17-.06.34.08.16.38.64.82 1.04.56.52 1.04.7 1.22.77.18.07.28.06.38-.04.1-.1.44-.48.57-.64.12-.16.25-.14.42-.08.17.06.1.1 1.27.67.31.15.52.22.58.34.08.13.03.48-.17.83-.22.35-.42.47-.7.55z" />
        </svg>
        WhatsApp
      </button>
      <button
        type="button"
        onClick={sendEmail}
        disabled={emailing}
        className={`${btn} text-blue-600 border border-blue-200 bg-white hover:bg-blue-50`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
        Email
      </button>
    </div>
  );
}
