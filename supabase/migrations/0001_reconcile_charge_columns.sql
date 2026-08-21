-- 0001: Reconcile charge columns on `documents`.
-- The per-column charges were replaced by the `taxable_charges` jsonb column.
-- This migration is idempotent and safe to re-run.

alter table documents add column if not exists taxable_charges jsonb not null default '[]'::jsonb;

alter table documents drop column if exists transport_charges;
alter table documents drop column if exists packing_forwarding_charges;
