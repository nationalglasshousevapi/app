-- 0004: Add invoice_count to customer_ledger_view
--
-- Lets the Accounts page show each customer's invoice count straight from
-- the view instead of fetching every invoice row and counting in JS.

create or replace view customer_ledger_view as
select
  c.id as customer_id,
  c.name as customer_name,
  c.opening_balance,
  coalesce(inv.total_invoiced, 0) as total_invoiced,
  coalesce(pay.total_paid, 0) as total_paid,
  coalesce(cnt.invoice_count, 0) as invoice_count,
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
) pay on pay.customer_id = c.id
left join (
  select customer_id, count(*) as invoice_count
  from documents
  where doc_type = 'invoice' and status != 'cancelled'
  group by customer_id
) cnt on cnt.customer_id = c.id;
