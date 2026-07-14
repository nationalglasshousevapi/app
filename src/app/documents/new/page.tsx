"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DocumentForm, { blankDocument, DocumentFormValue } from "@/components/DocumentForm";

function NewDocumentInner() {
  const searchParams = useSearchParams();
  const [initial, setInitial] = useState<DocumentFormValue | null>(null);

  useEffect(() => {
    const docType = (searchParams.get("type") as any) || "invoice";
    const customerId = searchParams.get("customer_id");
    const base = blankDocument(docType);

    async function fetchCustomer() {
      if (customerId) {
        try {
          const res = await fetch(`/api/customers/${customerId}`);
          const json = await res.json();
          const c = json.customer as {
            id: string;
            name: string;
            address?: string | null;
            contact_person?: string | null;
            contact_number?: string | null;
            email?: string | null;
            gst?: string | null;
          } | undefined;
          if (c) {
            base.customer_id = c.id;
            base.bill_to_name = c.name;
            base.bill_to_address = c.address ?? "";
            base.bill_to_contact_person = c.contact_person ?? "";
            base.bill_to_contact_number = c.contact_number ?? "";
            base.bill_to_email = c.email ?? "";
            base.bill_to_gst = c.gst ?? "";
            base.ship_to_name = c.name;
            base.ship_to_address = c.address ?? "";
            base.ship_to_contact_person = c.contact_person ?? "";
            base.ship_to_contact_number = c.contact_number ?? "";
          }
        } catch {
          // proceed with blank form
        }
      }
      setInitial(base);
    }

    fetchCustomer();
  }, [searchParams]);

  if (!initial) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return <DocumentForm initial={initial} />;
}

export default function NewDocumentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-400">Loading...</p>
      </div>
    }>
      <NewDocumentInner />
    </Suspense>
  );
}
