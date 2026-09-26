alter table public.products
  add column if not exists image_gallery jsonb not null default '[]'::jsonb;
