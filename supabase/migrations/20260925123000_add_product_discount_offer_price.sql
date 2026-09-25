alter table public.products
  add column if not exists discount_percentage numeric not null default 0
  check (discount_percentage >= 0 and discount_percentage <= 100);

alter table public.products
  add column if not exists offer_price numeric
  check (offer_price is null or offer_price >= 0);
