-- Optional delivery details on sales documents (invoice, order, quotation, etc.)
alter table documents add column if not exists driver_name text;
alter table documents add column if not exists materials text;
