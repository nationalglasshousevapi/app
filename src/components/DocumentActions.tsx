"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { docTypeLabel } from "@/lib/docTypes";
import { documentShareMessage, whatsAppShareUrl } from "@/lib/whatsapp";
import { useState } from "react";
import ConfirmModal from "./ConfirmModal";

function Icon({ type, className = "" }: { type: string; className?: string }) {
  const cls = `inline-block align-middle ${className}`;
  switch (type) {
    case "edit":
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>;
    case "pdf":
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm7 0l3 3h-3V4z" clipRule="evenodd" /></svg>;
    case "whatsapp":
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 1.5C5.58 1.5 2 5.08 2 9.5c0 1.88.63 3.62 1.69 5L2.5 18.5l4.24-1.08A8 8 0 0010 17.5c4.42 0 8-3.58 8-8s-3.58-8-8-8zm3.68 11.1c-.15.43-.88.82-1.46.82-1.4 0-3.57-.97-4.7-2.04C5.65 9.6 5.06 8.23 5 7.55c0-.58.43-.95.66-1.12.12-.09.26-.14.35-.14s.18 0 .25.01c.08.01.18-.03.28.26.1.28.36.98.39 1.05.04.07.06.15.02.24-.04.09-.06.13-.14.22-.07.09-.16.19-.23.27-.06.08-.14.17-.06.34.08.16.38.64.82 1.04.56.52 1.04.7 1.22.77.18.07.28.06.38-.04.1-.1.44-.48.57-.64.12-.16.25-.14.42-.08.17.06.1.1 1.27.67.31.15.52.22.58.34.08.13.03.48-.17.83-.22.35-.42.47-.7.55z" /></svg>;
    case "copy":
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>;
    case "delete":
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
    case "email":
      return <svg className={cls} viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>;
    default:
      return null;
  }
}

export default function DocumentActions({
  id,
  docNumber,
  docType,
  customerName,
  contactNumber,
  totalAmount,
  compact = false,
}: {
  id: string;
  docNumber: string;
  docType: string;
  customerName: string;
  contactNumber?: string | null;
  totalAmount: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emailing, setEmailing] = useState(false);

  function handleDeleteClick() {
    setConfirmDelete(true);
  }

  async function deleteDoc() {
    setConfirmDelete(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (pathname.includes(`/documents/${id}`)) {
          router.push("/documents");
        } else {
          router.refresh();
        }
      } else {
        const json = await res.json();
        alert(json.error || "Could not delete document.");
      }
    } catch {
      alert("Could not delete. Check your connection.");
    } finally {
      setDeleting(false);
    }
  }

  const pdfUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/documents/${id}/pdf`
      : `/api/documents/${id}/pdf`;

  const whatsappHref = whatsAppShareUrl({
    phone: contactNumber,
    text: documentShareMessage({
      docTypeLabel: docTypeLabel(docType),
      docNumber,
      customerName: customerName || "Customer",
      totalAmount,
      pdfUrl,
    }),
  });

  async function duplicate() {
    if (duplicating) return;
    setDuplicating(true);
    try {
      const res = await fetch("/api/documents/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (res.ok && json.document) {
        router.push(`/documents/${json.document.id}`);
        router.refresh();
      } else {
        alert(json.error || "Could not duplicate. Please try again.");
      }
    } catch {
      alert("Could not duplicate. Check your connection.");
    } finally {
      setDuplicating(false);
    }
  }

  async function sendEmail() {
    if (emailing) return;
    setEmailing(true);
    try {
      const res = await fetch(`/api/documents/${id}/email`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        alert("Invoice sent to customer's email.");
      } else {
        alert(json.error || "Could not send email.");
      }
    } catch {
      alert("Could not send email. Check your connection.");
    } finally {
      setEmailing(false);
    }
  }

  const btn = (icon: string, label: string, extra = "") =>
    `inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${extra}`;

  if (compact) {
    return (
      <>
        <div className="inline-flex items-center gap-1">
          <Link href={`/documents/${id}`} title="Edit" className={btn("", "", "text-brand-600 hover:bg-brand-50")}>
            <Icon type="edit" />
          </Link>
          <a href={`/api/documents/${id}/pdf`} download={`${docNumber}.pdf`} title="Download PDF" className={btn("", "", "text-red-600 hover:bg-red-50")}>
            <Icon type="pdf" />
          </a>
          <button onClick={sendEmail} disabled={emailing} title="Email to customer" className={btn("", "", "text-blue-600 hover:bg-blue-50")}>
            {emailing ? <span className="text-xs">…</span> : <Icon type="email" />}
          </button>
          <button onClick={() => window.open(whatsappHref, '_blank')} title="Share on WhatsApp" className={btn("", "", "text-emerald-600 hover:bg-emerald-50")}>
            <Icon type="whatsapp" />
          </button>
          <button onClick={duplicate} disabled={duplicating} title="Duplicate" className={btn("", "", "text-slate-500 hover:bg-slate-100")}>
            {duplicating ? <span className="text-xs">…</span> : <Icon type="copy" />}
          </button>
          <button onClick={handleDeleteClick} disabled={deleting} title="Delete" className={btn("", "", "text-red-500 hover:bg-red-50")}>
            {deleting ? <span className="text-xs">…</span> : <Icon type="delete" />}
          </button>
        </div>
        <ConfirmModal
          open={confirmDelete}
          title="Delete document"
          message={`Delete ${docNumber}? This cannot be undone.`}
          busy={deleting}
          onConfirm={deleteDoc}
          onCancel={() => setConfirmDelete(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link href={`/documents/${id}`} title="Edit" className={btn("edit", "Edit", "btn-secondary flex-1 text-sm")}>
          <Icon type="edit" className="mr-1" /> Edit
        </Link>
        <div className="flex flex-1 gap-2">
          <a href={`/api/documents/${id}/pdf`} target="_blank" title="Open PDF" className={btn("pdf", "PDF", "btn-secondary flex-1 text-sm")}>
            <Icon type="pdf" className="mr-1" /> PDF
          </a>
          <a href={`/api/documents/${id}/pdf`} download={`${docNumber}.pdf`} title="Download PDF" className={btn("pdf", "", "btn-secondary flex-1 text-sm")}>
            <Icon type="pdf" />
          </a>
        </div>
        <button onClick={sendEmail} disabled={emailing} title="Email to customer" className={btn("email", "Email", "btn-secondary flex-1 text-sm text-blue-600 border-blue-200")}>
          {emailing ? <span className="text-xs">…</span> : <><Icon type="email" className="mr-1" /> Email</>}
        </button>
        <button onClick={() => window.open(whatsappHref, '_blank')} title="Share on WhatsApp" className={btn("whatsapp", "WhatsApp", "btn-secondary flex-1 text-sm text-emerald-700 border-emerald-200")}>
          <Icon type="whatsapp" className="mr-1" /> WhatsApp
        </button>
        <button onClick={duplicate} disabled={duplicating} title="Duplicate" className={btn("copy", "Copy", "btn-secondary flex-1 text-sm")}>
          {duplicating ? <span className="text-xs">…</span> : <><Icon type="copy" className="mr-1" /> Copy</>}
        </button>
        <button onClick={handleDeleteClick} disabled={deleting} title="Delete" className={btn("delete", "Delete", "btn-secondary flex-1 text-sm text-red-600 border-red-200")}>
          {deleting ? <span className="text-xs">…</span> : <><Icon type="delete" className="mr-1" /> Delete</>}
        </button>
      </div>
      <ConfirmModal
        open={confirmDelete}
        title="Delete document"
        message={`Delete ${docNumber}? This cannot be undone.`}
        busy={deleting}
        onConfirm={deleteDoc}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
