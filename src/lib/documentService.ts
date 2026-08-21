import type { SupabaseClient } from "@supabase/supabase-js";
import { docTypeShort, financialYearFor } from "@/lib/docTypes";
import {
  AdditionalCharge,
  ParsedItem,
  TaxableCharge,
  computeTax,
  computeTotal,
  formatItemRows,
} from "@/lib/documents";

export class DocumentServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentServiceError";
  }
}

export function formatDocNumber(docType: string, fy: string, seq: number | string): string {
  return `${docTypeShort(docType)}-${fy}-${String(seq).padStart(4, "0")}`;
}

export interface DocumentTotalsInput {
  tax_type?: string;
  tax_rate?: number;
  discount_amount?: number;
  additional_charges?: AdditionalCharge[] | null;
  taxable_charges?: TaxableCharge[] | null;
}

export interface DocumentTotals {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  round_off: number;
  total_amount: number;
}

export function computeSubtotal(items: ParsedItem[]): number {
  return items.reduce((sum, it) => sum + (it.qty || 0) * (it.rate || 0), 0);
}

export function computeDocumentMoney(
  items: ParsedItem[],
  input: DocumentTotalsInput = {},
): DocumentTotals {
  const subtotal = computeSubtotal(items);
  const discountAmount = input.discount_amount || 0;
  const taxableCharges = input.taxable_charges ?? [];
  const additionalCharges = input.additional_charges ?? [];
  const { cgst, sgst, igst } = computeTax(
    subtotal,
    input.tax_type ?? "none",
    input.tax_rate ?? 0,
    discountAmount,
    taxableCharges,
  );
  const { totalAmount, roundOff } = computeTotal(
    subtotal,
    cgst,
    sgst,
    igst,
    discountAmount,
    additionalCharges,
    taxableCharges,
  );
  return { subtotal, cgst, sgst, igst, round_off: roundOff, total_amount: totalAmount };
}

export interface DocumentSnapshotFields {
  name?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  gst?: string | null;
}

export interface DocumentShipToFields {
  name?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
}

export type StoredTotals = DocumentTotals;

export interface CopyableItemRow {
  description: unknown;
  size: unknown;
  hsn_code: unknown;
  qty: unknown;
  unit: unknown;
  rate: unknown;
  total: unknown;
  actual_length?: unknown;
  actual_width?: unknown;
  nos?: unknown;
  calculated_length?: unknown;
  calculated_width?: unknown;
}

export function buildCopiedItemRows(
  sourceItems: CopyableItemRow[],
  documentId: string,
) {
  return sourceItems.map((it, idx) => ({
    document_id: documentId,
    position: idx,
    description: it.description,
    size: it.size,
    hsn_code: it.hsn_code,
    qty: it.qty,
    unit: it.unit,
    rate: it.rate,
    total: it.total,
    actual_length: it.actual_length || 0,
    actual_width: it.actual_width || 0,
    nos: it.nos || 1,
    calculated_length: it.calculated_length || 0,
    calculated_width: it.calculated_width || 0,
  }));
}

export interface CreateDocumentRecordInput {
  doc_type: string;
  doc_number?: string;
  doc_date?: Date;
  order_number?: string | null;
  order_date?: string | null;
  customer_id?: string | null;
  bill_to?: DocumentSnapshotFields;
  ship_to?: DocumentShipToFields;
  tax_type?: string;
  tax_rate?: number;
  discount_amount?: number;
  additional_charges?: AdditionalCharge[] | null;
  taxable_charges?: TaxableCharge[] | null;
  remarks?: string | null;
  status?: string;
  items?: ParsedItem[];
  stored_totals?: StoredTotals;
  copied_items?: CopyableItemRow[];
  items_error_prefix?: string;
}

function orNull(value: string | null | undefined): string | null {
  return value || null;
}

export async function createDocumentRecord(
  sb: SupabaseClient,
  input: CreateDocumentRecordInput,
): Promise<{ document: Record<string, unknown> }> {
  const docDate = input.doc_date ?? new Date();
  const fy = financialYearFor(docDate);

  let docNumber: string;
  if (input.doc_number) {
    docNumber = input.doc_number;
  } else {
    const { data: seqData, error: seqError } = await sb.rpc("next_document_number", {
      p_doc_type: input.doc_type,
      p_financial_year: fy,
    });
    if (seqError) throw new DocumentServiceError(seqError.message);
    docNumber = formatDocNumber(input.doc_type, fy, String(seqData));
  }

  const money: DocumentTotals = input.stored_totals
    ? {
        subtotal: input.stored_totals.subtotal,
        cgst: input.stored_totals.cgst,
        sgst: input.stored_totals.sgst,
        igst: input.stored_totals.igst,
        round_off: input.stored_totals.round_off,
        total_amount: input.stored_totals.total_amount,
      }
    : computeDocumentMoney(input.items ?? [], {
        tax_type: input.tax_type,
        tax_rate: input.tax_rate,
        discount_amount: input.discount_amount,
        additional_charges: input.additional_charges,
        taxable_charges: input.taxable_charges,
      });

  const bill = input.bill_to ?? {};
  const ship = input.ship_to ?? {};

  const { data: doc, error: docError } = await sb
    .from("documents")
    .insert({
      doc_type: input.doc_type,
      doc_number: docNumber,
      financial_year: fy,
      doc_date: docDate.toISOString().slice(0, 10),
      order_number: orNull(input.order_number ?? undefined),
      order_date: orNull(input.order_date ?? undefined),
      customer_id: input.customer_id ?? null,
      bill_to_name: orNull(bill.name ?? undefined),
      bill_to_address: orNull(bill.address ?? undefined),
      bill_to_contact_person: orNull(bill.contactPerson ?? undefined),
      bill_to_contact_number: orNull(bill.contactNumber ?? undefined),
      bill_to_email: orNull(bill.email ?? undefined),
      bill_to_gst: orNull(bill.gst ?? undefined),
      ship_to_name: orNull(ship.name ?? undefined),
      ship_to_address: orNull(ship.address ?? undefined),
      ship_to_contact_person: orNull(ship.contactPerson ?? undefined),
      ship_to_contact_number: orNull(ship.contactNumber ?? undefined),
      subtotal: money.subtotal,
      tax_type: input.tax_type ?? "none",
      tax_rate: input.tax_rate ?? 0,
      cgst_amount: money.cgst,
      sgst_amount: money.sgst,
      igst_amount: money.igst,
      round_off: money.round_off,
      discount_amount: input.discount_amount || 0,
      additional_charges: input.additional_charges ?? [],
      taxable_charges: input.taxable_charges ?? [],
      total_amount: money.total_amount,
      remarks: input.remarks ?? null,
      status: input.status || "draft",
    })
    .select()
    .single();

  if (docError) throw new DocumentServiceError(docError.message);

  let itemRows: Record<string, unknown>[] | null = null;
  if (input.copied_items?.length) {
    itemRows = buildCopiedItemRows(input.copied_items, doc.id);
  } else if (input.items?.length) {
    itemRows = formatItemRows(input.items, doc.id);
  }

  if (itemRows) {
    const prefix = input.items_error_prefix ?? "Could not save line items";
    const { error: itemsError } = await sb.from("document_items").insert(itemRows);
    if (itemsError) {
      await sb.from("documents").delete().eq("id", doc.id);
      throw new DocumentServiceError(`${prefix}: ${itemsError.message}`);
    }
  }

  return { document: doc };
}
