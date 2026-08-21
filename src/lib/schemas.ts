import { z } from "zod";
import { fromError } from "zod-validation-error";

export const docTypeSchema = z.enum([
  "invoice",
  "quotation",
  "performa_invoice",
  "estimate",
  "receipt",
  "purchase",
]);

export const documentStatusSchema = z.enum(["draft", "sent", "paid", "cancelled", "converted"]);

export const taxTypeSchema = z.enum(["cgst_sgst", "igst", "none"]);

export const itemSchema = z.object({
  description: z.string().min(1, "Description is required."),
  size: z.string().optional().default(""),
  hsn_code: z.string().optional().default(""),
  qty: z.number().positive("Quantity must be greater than 0."),
  unit: z.string().optional().default("sq.ft"),
  rate: z.number().min(0, "Rate cannot be negative."),
  actual_length: z.number().min(0).optional().default(0),
  actual_width: z.number().min(0).optional().default(0),
  nos: z.number().int().min(1).optional().default(1),
  calculated_length: z.number().min(0).optional().default(0),
  calculated_width: z.number().min(0).optional().default(0),
  item_type: z.enum(["glass", "charge"]).optional().default("glass"),
});

export const additionalChargeSchema = z.object({
  label: z.string().min(1, "Charge label is required."),
  amount: z.number().min(0, "Amount cannot be negative."),
});

export const taxableChargeSchema = z.object({
  label: z.string().min(1, "Charge label is required."),
  amount: z.number().min(0, "Amount cannot be negative."),
});

export const createDocumentSchema = z.object({
  doc_type: docTypeSchema,
  doc_number: z.string().optional(),
  doc_date: z.string().optional(),
  order_number: z.string().optional().default(""),
  order_date: z.string().optional().default(""),
  customer_id: z.string().uuid().nullable().optional(),
  bill_to_name: z.string().min(1, "Customer name is required."),
  bill_to_address: z.string().optional().default(""),
  bill_to_contact_person: z.string().optional().default(""),
  bill_to_contact_number: z.string().optional().default(""),
  bill_to_email: z.string().optional().default(""),
  bill_to_gst: z.string().optional().default(""),
  ship_to_name: z.string().optional().default(""),
  ship_to_address: z.string().optional().default(""),
  ship_to_contact_person: z.string().optional().default(""),
  ship_to_contact_number: z.string().optional().default(""),
  tax_type: taxTypeSchema.optional().default("cgst_sgst"),
  tax_rate: z.number().optional().default(0.18),
  discount_amount: z.number().min(0).optional().default(0),
  additional_charges: z.array(additionalChargeSchema).optional().default([]),
  taxable_charges: z.array(taxableChargeSchema).optional().default([]),
  remarks: z.string().nullable().optional().default(null),
  status: z.string().optional().default("draft"),
  items: z.array(itemSchema).min(1, "Add at least one line item."),
});

export const updateDocumentSchema = createDocumentSchema.omit({ doc_type: true });

export const paymentModeSchema = z.enum(["cash", "bank_transfer", "upi", "cheque", "adjustment"]);

// Quick cash sale: a walk-in/counter invoice that is paid immediately.
export const createCashSaleSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().optional().default(""),
  customer_phone: z.string().optional().default(""),
  doc_date: z.string().optional(),
  tax_type: taxTypeSchema.optional().default("cgst_sgst"),
  discount_amount: z.number().min(0).optional().default(0),
  taxable_charges: z.array(taxableChargeSchema).optional().default([]),
  remarks: z.string().nullable().optional().default(null),
  items: z.array(itemSchema).min(1, "Add at least one line item."),
  payment_mode: paymentModeSchema.optional().default("cash"),
  reference_number: z.string().optional().default(""),
});

export const expenseCategorySchema = z.enum([
  "material",
  "labour",
  "transport",
  "rent_utilities",
  "office",
  "other",
]);

export const createExpenseSchema = z.object({
  expense_date: z.string().optional(),
  category: expenseCategorySchema.optional().default("other"),
  description: z.string().optional().default(""),
  amount: z.number().positive("Amount must be greater than 0."),
  payment_mode: paymentModeSchema.optional().default("cash"),
  reference_number: z.string().optional().default(""),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const createPaymentSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  payment_date: z.string().optional(),
  amount: z.number().positive("Amount must be greater than 0."),
  payment_mode: paymentModeSchema.optional().default("cash"),
  reference_number: z.string().optional().default(""),
  document_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  generate_receipt: z.boolean().optional().default(false),
});

export const updatePaymentSchema = createPaymentSchema.partial();

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required."),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  contact_number: z.string().optional(),
  email: z.string().optional(),
  gst: z.string().optional(),
  opening_balance: z.number().min(0, "Opening balance cannot be negative.").optional().default(0),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export function parseError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return fromError(error).toString();
  }
  return "Invalid request.";
}
