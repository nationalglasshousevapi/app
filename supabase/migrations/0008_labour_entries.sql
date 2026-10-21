-- 0008: Labour entries (work performed, amount owed vs paid).
-- Each entry's paid amount is mirrored into `expenses` (category 'labour') by
-- the app so dashboard/daybook/export keep counting labour as a business cost.
-- Idempotent and safe to re-run.

create table if not exists labour_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  worker_name text not null,
  work_description text,
  amount_owed numeric(12,2) not null check (amount_owed > 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  payment_mode text not null default 'cash' check (payment_mode in (
    'cash', 'bank_transfer', 'upi', 'cheque', 'adjustment'
  )),
  reference_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_paid <= amount_owed)
);

create index if not exists idx_labour_entries_date on labour_entries (entry_date);

alter table labour_entries enable row level security;

drop trigger if exists trg_labour_entries_updated on labour_entries;
create trigger trg_labour_entries_updated before update on labour_entries
  for each row execute function set_updated_at();

alter table expenses add column if not exists labour_entry_id uuid
  references labour_entries(id) on delete cascade;

create index if not exists idx_expenses_labour_entry on expenses (labour_entry_id);
