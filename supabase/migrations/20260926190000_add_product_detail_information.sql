alter table public.products
  add column if not exists product_type text,
  add column if not exists occasion_type text,
  add column if not exists material text,
  add column if not exists brand text,
  add column if not exists quality text,
  add column if not exists fabric text,
  add column if not exists care text,
  add column if not exists delivery_returns text,
  add column if not exists cod_available boolean not null default true,
  add column if not exists custom_order_cod boolean not null default false,
  add column if not exists easy_returns boolean not null default true,
  add column if not exists express_shipping boolean not null default true;