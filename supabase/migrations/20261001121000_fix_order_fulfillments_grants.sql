-- Fix Data API privileges for the existing order fulfillment table.
-- RLS policies continue to restrict which authenticated users can access rows.
grant select, insert, update, delete on table public.order_fulfillments to authenticated;
