-- 0005: Add "order" document type.
-- Quick cash sales now create an Order (ORD-YY-NN) instead of an Invoice;
-- an order can be converted to an invoice later with a fresh INV number.
-- Idempotent and safe to re-run.

alter table documents drop constraint if exists documents_doc_type_check;

alter table documents add constraint documents_doc_type_check check (doc_type in (
  'invoice', 'order', 'quotation', 'performa_invoice', 'estimate', 'receipt', 'purchase'
));

-- Orders get their own number series (ORD-YY-NN), separate from invoices.
insert into counters (doc_type, financial_year, last_number)
select 'order', financial_year, 0
from counters
where doc_type = 'invoice'
on conflict (doc_type, financial_year) do nothing;
