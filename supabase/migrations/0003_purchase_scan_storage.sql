-- 0003: Purchase invoice scan storage.
-- Creates a private bucket for scanned supplier invoices. Objects are stored
-- at {document_id}/original.{ext} and served only through the app's API.
-- Idempotent and safe to re-run.

insert into storage.buckets (id, name, public)
values ('purchase-scans', 'purchase-scans', false)
on conflict (id) do nothing;
