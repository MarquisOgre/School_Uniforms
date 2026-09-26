-- Reporting queries filter and sort by created_at.
create index if not exists idx_orders_created_at_desc
  on public.orders (created_at desc);

create index if not exists idx_coupons_created_at_desc
  on public.coupons (created_at desc);
