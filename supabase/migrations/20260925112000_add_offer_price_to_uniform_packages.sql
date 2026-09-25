alter table public.uniform_packages
  add column if not exists offer_price numeric
  check (offer_price is null or offer_price >= 0);
