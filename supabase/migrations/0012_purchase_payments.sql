create table if not exists purchase_payments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  payment_mode text not null default 'cash' check (payment_mode in (
    'cash', 'bank_transfer', 'upi', 'cheque', 'adjustment'
  )),
  reference_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_purchase_payments_document on purchase_payments (document_id);
create index if not exists idx_purchase_payments_date on purchase_payments (payment_date);

alter table purchase_payments enable row level security;

drop trigger if exists trg_purchase_payments_updated on purchase_payments;
create trigger trg_purchase_payments_updated before update on purchase_payments
  for each row execute function set_updated_at();
