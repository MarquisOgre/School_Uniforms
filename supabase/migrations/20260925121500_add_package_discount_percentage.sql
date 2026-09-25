alter table public.uniform_packages
  add column if not exists discount_percentage numeric not null default 0
  check (discount_percentage >= 0 and discount_percentage <= 100);
