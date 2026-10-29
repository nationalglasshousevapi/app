-- 0013: allow labour advances/overpayments and standalone payments.
-- An entry may now be work-only, payment-only (advance), or work + payment
-- with any paid amount. Idempotent and safe to re-run.

alter table labour_entries drop constraint if exists labour_entries_amount_owed_check;
alter table labour_entries drop constraint if exists labour_entries_check;

alter table labour_entries add constraint labour_entries_amount_owed_check
  check (amount_owed >= 0);

alter table labour_entries add constraint labour_entries_check
  check (amount_owed > 0 or amount_paid > 0);
