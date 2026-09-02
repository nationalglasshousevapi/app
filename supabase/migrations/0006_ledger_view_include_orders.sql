-- 0006: Include Orders in customer ledger view.
-- Cash sales create Order documents; those amounts are money owed/collected
-- and must count toward each customer's balance. Idempotent and safe to re-run.

create or replace view customer_ledger_view as
select
  c.id as customer_id,
  c.name as customer_name,
  c.opening_balance,
  coalesce(inv.total_invoiced, 0) as total_invoiced,
  coalesce(pay.total_paid, 0) as total_paid,
  (c.opening_balance + coalesce(inv.total_invoiced, 0) - coalesce(pay.total_paid, 0)) as balance_due,
  coalesce(cnt.invoice_count, 0) as invoice_count
from customers c
left join (
  select customer_id, sum(total_amount) as total_invoiced
  from documents
  where doc_type in ('invoice', 'order') and status != 'cancelled'
  group by customer_id
) inv on inv.customer_id = c.id
left join (
  select customer_id, sum(amount) as total_paid
  from payments
  group by customer_id
) pay on pay.customer_id = c.id
left join (
  select customer_id, count(*) as invoice_count
  from documents
  where doc_type in ('invoice', 'order') and status != 'cancelled'
  group by customer_id
) cnt on cnt.customer_id = c.id;
