alter table public.products
  add column if not exists color_order jsonb not null default '[]'::jsonb;
