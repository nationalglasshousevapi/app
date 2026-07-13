"use client";

import DocumentForm, { blankDocument } from "@/components/DocumentForm";

export default function NewDocumentPage() {
  return <DocumentForm initial={blankDocument()} />;
}
