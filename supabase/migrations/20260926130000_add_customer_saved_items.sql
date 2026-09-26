create table if not exists public.customer_saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('product','package')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create index if not exists customer_saved_items_user_idx
  on public.customer_saved_items(user_id);

alter table public.customer_saved_items enable row level security;

drop policy if exists "customer_saved_items_read_own" on public.customer_saved_items;
create policy "customer_saved_items_read_own"
on public.customer_saved_items for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "customer_saved_items_insert_own" on public.customer_saved_items;
create policy "customer_saved_items_insert_own"
on public.customer_saved_items for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "customer_saved_items_delete_own" on public.customer_saved_items;
create policy "customer_saved_items_delete_own"
on public.customer_saved_items for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, delete on public.customer_saved_items to authenticated;
