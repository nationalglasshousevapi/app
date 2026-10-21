-- 0009: Workers (people who do labour) and link labour entries to them.
-- Labour entries keep `worker_name` as a historical snapshot; `worker_id`
-- powers per-worker statements. Idempotent and safe to re-run.

create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  opening_balance numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workers_name on workers (name);

alter table workers enable row level security;

drop trigger if exists trg_workers_updated on workers;
create trigger trg_workers_updated before update on workers
  for each row execute function set_updated_at();

alter table labour_entries add column if not exists worker_id uuid
  references workers(id) on delete set null;

create index if not exists idx_labour_entries_worker on labour_entries (worker_id);

-- Backfill: one worker per distinct existing name, then link entries.
insert into workers (name)
select distinct on (lower(trim(worker_name))) trim(worker_name)
from labour_entries
where trim(worker_name) <> ''
order by lower(trim(worker_name));

update labour_entries le
set worker_id = w.id
from workers w
where le.worker_id is null
  and lower(trim(le.worker_name)) = lower(w.name);
