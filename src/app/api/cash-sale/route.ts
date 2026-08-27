import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseItems } from "@/lib/documents";
import { DocumentServiceError, computeDocumentMoney, createDocumentRecord } from "@/lib/documentService";
import { createCashSaleSchema, parseError } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createCashSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parseError(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  if (input.payment_mode === "adjustment") {
    return NextResponse.json(
      { error: "Cash sales cannot use Adjustment mode." },
      { status: 400 },
    );
  }

  const sb = supabaseServer();
  const items = parseItems(input.items);

  // ---- Customer handling: always require a customer name, auto-create if walk-in ----
  const trimmedName = input.customer_name?.trim() || "";
  let customerId: string | null = input.customer_id ?? null;
  let snap: {
    id?: string;
    name: string;
    address: string | null;
    contact_person: string | null;
    contact_number: string | null;
    email: string | null;
    gst: string | null;
  } | null = null;

  if (customerId) {
    const { data: customer } = await sb
      .from("customers")
      .select("id, name, address, contact_person, contact_number, email, gst")
      .eq("id", customerId)
      .single();
    if (customer) {
      snap = customer;
    } else {
      // Invalid customer_id provided — fall back to name handling
      customerId = null;
    }
  }

  if (!customerId) {
    if (!trimmedName) {
      return NextResponse.json({ error: "Customer name is required. Pick a customer or enter a new name." }, { status: 400 });
    }
    // Try to reuse existing customer with exact case-insensitive match to avoid duplicates for cash customers
    const { data: existing } = await sb
      .from("customers")
      .select("id, name, address, contact_person, contact_number, email, gst")
      .ilike("name", trimmedName)
      .limit(10);
    const exact = existing?.find((c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (exact) {
      customerId = exact.id;
      snap = exact;
    } else {
      // Auto-create customer for quick cash order tracking (no GST required)
      const { data: newCust, error: createErr } = await sb
        .from("customers")
        .insert({
          name: trimmedName,
          contact_number: input.customer_phone?.trim() || null,
        })
        .select("id, name, address, contact_person, contact_number, email, gst")
        .single();
      if (createErr || !newCust) {
        return NextResponse.json({ error: createErr?.message || "Could not create customer." }, { status: 500 });
      }
      customerId = newCust.id;
      snap = newCust;
    }
  }

  const billToName = snap?.name || trimmedName;

  // ---- Compute totals to validate paid vs balance ----
  const taxRate = input.tax_type === "none" ? 0 : 0.18;
  const money = computeDocumentMoney(items, {
    tax_type: input.tax_type,
    tax_rate: taxRate,
    discount_amount: input.discount_amount,
    taxable_charges: input.taxable_charges,
  });
  const totalAmount = money.total_amount;
  const amountPaid = input.amount_paid ?? 0;

  if (amountPaid < 0) {
    return NextResponse.json({ error: "Paid amount cannot be negative." }, { status: 400 });
  }
  if (amountPaid > totalAmount) {
    return NextResponse.json(
      { error: `Paid amount (${amountPaid}) cannot exceed total (${totalAmount}).` },
      { status: 400 },
    );
  }
  if (amountPaid > 0 && (input.payment_mode === "bank_transfer" || input.payment_mode === "cheque") && !input.reference_number?.trim()) {
    return NextResponse.json({ error: "Reference number is required for bank transfer / cheque." }, { status: 400 });
  }

  const docDate = input.doc_date ? new Date(input.doc_date) : new Date();
  // Status: fully paid -> paid, otherwise sent (balance due). Allows 0 paid = full credit order.
  const status = amountPaid >= totalAmount && totalAmount > 0 ? "paid" : amountPaid === 0 && totalAmount === 0 ? "draft" : "sent";

  let document: Record<string, unknown>;
  try {
    ({ document } = await createDocumentRecord(sb, {
      doc_type: "invoice",
      doc_date: docDate,
      customer_id: customerId,
      bill_to: {
        name: billToName,
        address: snap?.address ?? null,
        contactPerson: snap?.contact_person ?? null,
        contactNumber: snap?.contact_number ?? (input.customer_phone || null),
        email: snap?.email ?? null,
        gst: snap?.gst ?? null,
      },
      ship_to: { name: billToName },
      tax_type: input.tax_type,
      tax_rate: taxRate,
      discount_amount: input.discount_amount,
      taxable_charges: input.taxable_charges,
      remarks: input.remarks,
      status,
      items,
      stored_totals: money,
    }));
  } catch (err) {
    const message = err instanceof DocumentServiceError ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const docNumber = document.doc_number as string;
  const docId = document.id as string;

  // Only record a payment if some amount was actually paid now. 0 = full balance / order with no advance.
  let payment: Record<string, unknown> | null = null;
  if (amountPaid > 0) {
    const { data: payData, error: paymentError } = await sb
      .from("payments")
      .insert({
        customer_id: customerId,
        payment_date: docDate.toISOString().slice(0, 10),
        amount: amountPaid,
        payment_mode: input.payment_mode,
        reference_number: input.reference_number || null,
        document_id: docId,
        notes: `Cash sale ${docNumber}${amountPaid < totalAmount ? ` — advance ${amountPaid}/${totalAmount}` : ""}`,
      })
      .select()
      .single();

    if (paymentError) {
      return NextResponse.json(
        { document, warning: `Invoice saved but payment record failed: ${paymentError.message}`, balance_due: totalAmount - amountPaid },
        { status: 201 },
      );
    }
    payment = payData as Record<string, unknown>;
  }

  const balanceDue = totalAmount - amountPaid;

  return NextResponse.json({ document, payment, total_amount: totalAmount, amount_paid: amountPaid, balance_due: balanceDue }, { status: 201 });
}
