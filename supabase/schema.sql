-- National Glass House - database schema
-- Run this in the Supabase SQL editor (or `supabase db push`) once, before first use.

create extension if not exists "pgcrypto";

-- ========== Customers ==========
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  contact_person text,
  contact_number text,
  email text,
  gst text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_name on customers using gin (to_tsvector('simple', name));

-- ========== Document type counters (per financial year) ==========
-- doc_type values: invoice | quotation | performa_invoice | estimate | receipt | window_quotation
create table if not exists counters (
  doc_type text not null,
  financial_year text not null, -- e.g. '24-25'
  last_number integer not null default 0,
  primary key (doc_type, financial_year)
);

-- ========== Documents (invoices, quotations, etc.) ==========
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null check (doc_type in (
    'invoice', 'quotation', 'performa_invoice', 'estimate', 'receipt'
  )),
  doc_number text not null,          -- human-readable number, e.g. "24-25-071"
  financial_year text not null,      -- e.g. "24-25"
  doc_date date not null default current_date,
  order_number text,
  order_date date,

  customer_id uuid references customers(id) on delete set null,
  -- snapshot of customer details at time of creation, so edits to the customer
  -- record later don't silently change historical documents
  bill_to_name text,
  bill_to_address text,
  bill_to_contact_person text,
  bill_to_contact_number text,
  bill_to_email text,
  bill_to_gst text,
  ship_to_name text,
  ship_to_address text,
  ship_to_contact_person text,
  ship_to_contact_number text,

  subtotal numeric(12,2) not null default 0,
  tax_type text not null default 'cgst_sgst' check (tax_type in ('cgst_sgst', 'igst', 'none')),
  tax_rate numeric(5,4) not null default 0.18, -- combined rate, e.g. 0.18 = 18%
  cgst_amount numeric(12,2) not null default 0,
  sgst_amount numeric(12,2) not null default 0,
  igst_amount numeric(12,2) not null default 0,
  round_off numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  transport_charges numeric(12,2) not null default 0,
  packing_forwarding_charges numeric(12,2) not null default 0,
  additional_charges jsonb not null default '[]'::jsonb,
  total_amount numeric(12,2) not null default 0,

  remarks text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'cancelled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_type on documents (doc_type);
create index if not exists idx_documents_date on documents (doc_date);
create index if not exists idx_documents_customer on documents (customer_id);

-- ========== Line items ==========
create table if not exists document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  position integer not null default 0,
  description text not null,
  size text,
  hsn_code text,
  qty numeric(12,3) not null default 0,
  unit text default 'sq.ft',
  rate numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  -- Invoice-specific fields (used for glass size calculations)
  actual_length numeric(8,2) default 0,
  actual_width numeric(8,2) default 0,
  nos integer default 1,
  calculated_length numeric(8,2) default 0,
  calculated_width numeric(8,2) default 0,
  -- Item type: 'glass' (with dimensions) or 'charge' (flat amount)
  item_type text not null default 'glass' check (item_type in ('glass', 'charge'))
);

create index if not exists idx_items_document on document_items (document_id);

-- ========== Atomic numbering ==========
-- Called from the app when creating a new document. Does an atomic upsert +
-- increment so two people creating documents at the same time never collide.
create or replace function next_document_number(p_doc_type text, p_financial_year text)
returns integer as $$
declare
  v_number integer;
begin
  insert into counters (doc_type, financial_year, last_number)
  values (p_doc_type, p_financial_year, 1)
  on conflict (doc_type, financial_year)
  do update set last_number = counters.last_number + 1
  returning last_number into v_number;

  return v_number;
end;
$$ language plpgsql;

-- ========== updated_at triggers ==========
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_customers_updated on customers;
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();

drop trigger if exists trg_documents_updated on documents;
create trigger trg_documents_updated before update on documents
  for each row execute function set_updated_at();

-- ========== Safe migrations (idempotent ALTER TABLE) ==========

-- Ensure additional_charges column exists (added after initial schema creation)
alter table documents add column if not exists additional_charges jsonb not null default '[]'::jsonb;

-- Add item_type to document_items for charge items
alter table document_items add column if not exists item_type text not null default 'glass' check (item_type in ('glass', 'charge'));

-- Drop old fixed charge columns in favour of charge-type line items
alter table documents drop column if exists hardware_charges;
alter table documents drop column if exists transport_charges;
alter table documents drop column if exists packing_forwarding_charges;

-- ========== Customer Accounts / Payments ==========

alter table customers add column if not exists opening_balance numeric(12,2) not null default 0;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  payment_mode text not null default 'cash' check (payment_mode in (
    'cash', 'bank_transfer', 'upi', 'cheque', 'adjustment'
  )),
  reference_number text,
  document_id uuid references documents(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_customer on payments (customer_id);
create index if not exists idx_payments_date on payments (payment_date);

drop trigger if exists trg_payments_updated on payments;
create trigger trg_payments_updated before update on payments
  for each row execute function set_updated_at();

-- Ledger view: opening balance + invoiced - paid = balance due
create or replace view customer_ledger_view as
select
  c.id as customer_id,
  c.name as customer_name,
  c.opening_balance,
  coalesce(inv.total_invoiced, 0) as total_invoiced,
  coalesce(pay.total_paid, 0) as total_paid,
  (c.opening_balance + coalesce(inv.total_invoiced, 0) - coalesce(pay.total_paid, 0)) as balance_due
from customers c
left join (
  select customer_id, sum(total_amount) as total_invoiced
  from documents
  where doc_type = 'invoice' and status != 'cancelled'
  group by customer_id
) inv on inv.customer_id = c.id
left join (
  select customer_id, sum(amount) as total_paid
  from payments
  group by customer_id
) pay on pay.customer_id = c.id;

-- ========== Dashboard aggregation ==========
-- Returns all dashboard data in a single query for efficiency.
create or replace function get_dashboard_stats()
returns jsonb as $$
declare
  this_month text := to_char(now(), 'YYYY-MM');
begin
  return jsonb_build_object(
    'totalRevenue', (select coalesce(sum(total_amount), 0) from documents where doc_type = 'invoice'),
    'thisMonthRevenue', (select coalesce(sum(total_amount), 0) from documents where doc_type = 'invoice' and to_char(doc_date, 'YYYY-MM') = this_month),
    'invoiceCount', (select count(*) from documents where doc_type = 'invoice'),
    'customerCount', (select count(*) from customers),
    'monthlySeries', COALESCE((
      select jsonb_agg(jsonb_build_object('month', month, 'total', total) order by month)
      from (
        select to_char(date_trunc('month', doc_date)::date, 'YYYY-MM') as month, sum(total_amount) as total
        from documents
        where doc_type = 'invoice'
        group by date_trunc('month', doc_date)
        order by date_trunc('month', doc_date) desc
        limit 12
      ) sub
    ), '[]'::jsonb),
    'topCustomers', COALESCE((
      select jsonb_agg(jsonb_build_object(
        'id', customer_id,
        'name', bill_to_name,
        'total', total,
        'count', count
      ) order by total desc)
      from (
        select customer_id, bill_to_name, sum(total_amount) as total, count(*) as count
        from documents
        where doc_type = 'invoice'
        group by customer_id, bill_to_name
        order by total desc
        limit 8
      ) sub
    ), '[]'::jsonb),
    'documentTypeData', COALESCE((
      select jsonb_agg(jsonb_build_object('type', doc_type, 'count', count) order by count desc)
      from (
        select doc_type, count(*) as count
        from documents
        group by doc_type
      ) sub
    ), '[]'::jsonb)
  );
end;
$$ language plpgsql stable;

-- ========== Reusable descriptions (for dropdown in line items) ==========
create table if not exists descriptions (
  id uuid primary key default gen_random_uuid(),
  description text not null unique,
  created_at timestamptz not null default now()
);

-- Seed common descriptions and charge labels (idempotent — skips duplicates)
insert into descriptions (description) values
  ('5 mm Clear Glass'),
  ('5 mm Mirror'),
  ('4 mm Clear Glass'),
  ('12 mm Clear Glass'),
  ('10 mm Clear Glass'),
  ('8 mm Clear Glass'),
  ('12 mm Toughened Glass'),
  ('10 mm Toughened Glass'),
  ('8 mm Toughened Glass'),
  ('6 mm Toughened Glass'),
  ('6 mm Clear Glass'),
  ('6 mm Mirror'),
  ('4 mm Mirror'),
  ('Laminated Glass'),
  ('Frosted Glass'),
  ('Transport'),
  ('Labour'),
  ('Hardware'),
  ('Packing & Forwarding')
on conflict (description) do nothing;

-- ========== Row Level Security ==========
-- The app talks to Supabase using the service-role key from server-side API routes only,
-- which bypasses RLS. Enabling RLS here just makes sure the anon/public key (if ever used
-- client-side) can't read or write anything.
alter table customers enable row level security;
alter table documents enable row level security;
alter table document_items enable row level security;
alter table counters enable row level security;
alter table payments enable row level security;
alter table descriptions enable row level security;

