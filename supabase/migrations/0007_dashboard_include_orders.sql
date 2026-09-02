-- 0007: Orders count toward dashboard revenue.
-- Cash sales create Order documents; dashboard revenue/this-month/invoice
-- count/top customers should include them alongside invoices.
-- Idempotent and safe to re-run.

create or replace function get_dashboard_stats()
returns jsonb as $$
declare
  this_month text := to_char(now(), 'YYYY-MM');
begin
  return jsonb_build_object(
    'totalRevenue', (select coalesce(sum(total_amount), 0) from documents where doc_type in ('invoice', 'order')),
    'thisMonthRevenue', (select coalesce(sum(total_amount), 0) from documents where doc_type in ('invoice', 'order') and to_char(doc_date, 'YYYY-MM') = this_month),
    'invoiceCount', (select count(*) from documents where doc_type in ('invoice', 'order')),
    'customerCount', (select count(*) from customers),
    'monthlySeries', COALESCE((
      select jsonb_agg(jsonb_build_object('month', month, 'total', total) order by month)
      from (
        select to_char(date_trunc('month', doc_date)::date, 'YYYY-MM') as month, sum(total_amount) as total
        from documents
        where doc_type in ('invoice', 'order')
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
        where doc_type in ('invoice', 'order')
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
