-- 0011: Count only the live document in a conversion chain.
--
-- Converting order -> quotation -> invoice creates a new document and marks the
-- source "converted", but the source row is still an order/invoice with an
-- amount. The ledger and dashboard summed every such row, so one sale counted
-- once per conversion step. Ignore superseded ("converted") documents the same
-- way cancelled ones are ignored. Idempotent and safe to re-run.

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
  where doc_type in ('invoice', 'order') and status not in ('cancelled', 'converted')
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
  where doc_type in ('invoice', 'order') and status not in ('cancelled', 'converted')
  group by customer_id
) cnt on cnt.customer_id = c.id;

create or replace function get_dashboard_stats()
returns jsonb as $$
declare
  this_month text := to_char(now(), 'YYYY-MM');
begin
  return jsonb_build_object(
    'totalRevenue', (select coalesce(sum(total_amount), 0) from documents where doc_type in ('invoice', 'order') and status not in ('cancelled', 'converted')),
    'thisMonthRevenue', (select coalesce(sum(total_amount), 0) from documents where doc_type in ('invoice', 'order') and status not in ('cancelled', 'converted') and to_char(doc_date, 'YYYY-MM') = this_month),
    'invoiceCount', (select count(*) from documents where doc_type in ('invoice', 'order') and status not in ('cancelled', 'converted')),
    'customerCount', (select count(*) from customers),
    'monthlySeries', COALESCE((
      select jsonb_agg(jsonb_build_object('month', month, 'total', total) order by month)
      from (
        select to_char(date_trunc('month', doc_date)::date, 'YYYY-MM') as month, sum(total_amount) as total
        from documents
        where doc_type in ('invoice', 'order') and status not in ('cancelled', 'converted')
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
        where doc_type in ('invoice', 'order') and status not in ('cancelled', 'converted')
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
