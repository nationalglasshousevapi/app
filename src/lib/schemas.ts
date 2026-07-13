import { z } from "zod";
import { fromError } from "zod-validation-error";

export const docTypeSchema = z.enum([
  "invoice",
  "quotation",
  "performa_invoice",
  "estimate",
  "receipt",
  "window_quotation",
]);

export const taxTypeSchema = z.enum(["cgst_sgst", "igst", "none"]);

export const itemSchema = z.object({
  description: z.string().min(1, "Description is required."),
  size: z.string().optional().default(""),
  hsn_code: z.string().optional().default(""),
  qty: z.number().positive("Quantity must be greater than 0."),
  unit: z.string().optional().default("sq.ft"),
  rate: z.number().min(0, "Rate cannot be negative."),
});

export const createDocumentSchema = z.object({
  doc_type: docTypeSchema,
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
  round_off: z.number().optional().default(0),
  remarks: z.string().nullable().optional().default(null),
  status: z.string().optional().default("draft"),
  items: z.array(itemSchema).min(1, "Add at least one line item."),
});

export const updateDocumentSchema = createDocumentSchema.omit({ doc_type: true });

export function parseError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return fromError(error).toString();
  }
  return "Invalid request.";
}
