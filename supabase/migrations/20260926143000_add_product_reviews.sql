create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_user_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  title text,
  review text,
  verified_purchase boolean not null default false,
  status text not null default 'published' check (status in ('pending','published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_reviews_product_status
  on public.product_reviews(product_id, status, created_at desc);

create index if not exists idx_product_reviews_customer
  on public.product_reviews(customer_user_id);

alter table public.product_reviews enable row level security;

create policy product_reviews_read on public.product_reviews
for select to authenticated
using (
  status = 'published'
  or customer_user_id = (select auth.uid())
  or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager')
);

create policy product_reviews_insert on public.product_reviews
for insert to authenticated
with check (
  customer_user_id = (select auth.uid())
  and status = 'published'
);

create policy product_reviews_update_own on public.product_reviews
for update to authenticated
using (
  customer_user_id = (select auth.uid())
  or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager')
)
with check (
  customer_user_id = (select auth.uid())
  or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager')
);

create trigger product_reviews_set_updated_at
before update on public.product_reviews
for each row execute function public.set_updated_at();

create or replace function public.set_product_review_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.verified_purchase :=
    exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.customer_user_id = new.customer_user_id
        and oi.product_id = new.product_id
    );
  return new;
end;
$$;

drop trigger if exists product_reviews_verify_purchase on public.product_reviews;
create trigger product_reviews_verify_purchase
before insert or update on public.product_reviews
for each row execute function public.set_product_review_verified();

revoke execute on function public.set_product_review_verified() from public, anon, authenticated;

alter publication supabase_realtime add table public.product_reviews;
alter publication supabase_realtime add table public.support_messages;
