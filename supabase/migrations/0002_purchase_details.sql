-- 0002: Purchase invoice details.
-- Adds purchase-specific metadata to `documents` (IRN / e-invoice block,
-- logistics refs) and glass-trade dimensions to `document_items`.
-- All sales documents leave these columns NULL.
-- This migration is idempotent and safe to re-run.

alter table documents add column if not exists irn text;
alter table documents add column if not exists ack_number text;
alter table documents add column if not exists ack_date date;
alter table documents add column if not exists place_of_supply text;
alter table documents add column if not exists bilty_number text;
alter table documents add column if not exists vehicle_number text;

alter table document_items add column if not exists thickness numeric(6,2);
alter table document_items add column if not exists length_mm numeric(8,2);
alter table document_items add column if not exists width_mm numeric(8,2);
alter table document_items add column if not exists pcs integer;

create index if not exists idx_documents_supplier_gst_doc_number
  on documents (bill_to_gst, doc_number)
  where doc_type = 'purchase';
