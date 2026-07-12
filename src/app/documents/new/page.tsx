"use client";

import DocumentForm, { blankDocument } from "@/components/DocumentForm";

export default function NewDocumentPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-brand-600">New document</p>
        <h1 className="page-title">Create something for your customer</h1>
        <p className="page-subtitle">Start with the document type, then select a saved customer to fill their details quickly.</p>
      </div>
      <DocumentForm initial={blankDocument()} />
    </div>
  );
}
