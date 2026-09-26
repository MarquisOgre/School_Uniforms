alter table public.branch_payment_settings
  add column if not exists razorpay_enabled boolean not null default false;

alter table public.payments
  add column if not exists provider_order_id text;

create unique index if not exists payments_provider_order_id_uidx
  on public.payments(provider_order_id)
  where provider_order_id is not null;

create index if not exists payments_provider_payment_id_idx
  on public.payments(provider_payment_id)
  where provider_payment_id is not null;