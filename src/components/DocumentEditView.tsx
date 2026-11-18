"use client";

import { useState } from "react";
import DocumentForm, { DocumentFormValue } from "./DocumentForm";
import DocumentActions from "./DocumentActions";

export default function DocumentEditView({
  id,
  docNumber,
  docType,
  customerName,
  contactNumber,
  totalAmount,
  status,
  initial,
}: {
  id: string;
  docNumber: string;
  docType: string;
  customerName: string;
  contactNumber?: string | null;
  totalAmount: number;
  status: string;
  initial: DocumentFormValue;
}) {
  const [isDirty, setIsDirty] = useState(false);

  return (
    <>
      <DocumentActions
        id={id}
        docNumber={docNumber}
        docType={docType}
        customerName={customerName}
        contactNumber={contactNumber}
        totalAmount={totalAmount}
        status={status}
        dirty={isDirty}
      />
      <DocumentForm initial={initial} onDirtyChange={setIsDirty} />
    </>
  );
}
