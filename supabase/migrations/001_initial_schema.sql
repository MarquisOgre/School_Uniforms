-- School Uniforms — clean baseline schema
-- Multi-school / multi-branch architecture with RLS.
-- Customer catalogs are branch-scoped. Packages are composed from individual products.
-- Inventory is shared between individual products and package purchases.
-- Apply to a fresh Supabase project.

create extension if not exists pgcrypto;

create type public.account_role as enum ('admin','school_manager','branch_manager','customer');
create type public.record_status as enum ('active','inactive','suspended');
create type public.gender_type as enum ('boys','girls','unisex');
create type public.order_status as enum ('pending','confirmed','processing','ready','shipped','delivered','cancelled','refunded');
create type public.payment_status as enum ('pending','authorized','paid','failed','refunded','partially_refunded');
create type public.inventory_movement_type as enum ('opening','purchase','sale','reservation','release','adjustment','return','transfer_in','transfer_out');

create schema app_private;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  logo_url text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  code text not null,
  address_line1 text, address_line2 text, city text, state text, postal_code text,
  phone text, email text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, code),
  unique (id, school_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.account_role not null default 'customer',
  school_id uuid references public.schools(id) on delete set null,
  branch_id uuid,
  login_id text,
  phone text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, branch_id, login_id),
  unique (id, school_id, branch_id),
  foreign key (branch_id, school_id) references public.branches(id, school_id) on delete set null
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  branch_id uuid not null,
  user_id uuid unique references public.profiles(id) on delete set null,
  student_code text not null,
  full_name text not null,
  class_name text, section text,
  gender public.gender_type,
  date_of_birth date,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_code),
  unique (id, school_id, branch_id),
  foreign key (branch_id, school_id) references public.branches(id, school_id) on delete cascade
);

create table public.parent_student_links (
  parent_user_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relationship text not null default 'parent',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (parent_user_id, student_id)
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null, slug text not null unique, description text,
  gender public.gender_type not null default 'unisex',
  image_url text,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  size_label text, color text, variant_name text,
  price numeric(12,2) check (price is null or price >= 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, product_id)
);

create table public.branch_products (
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  branch_price numeric(12,2) not null check (branch_price >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (branch_id, product_id)
);

create table public.uniform_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique, description text,
  gender public.gender_type not null default 'unisex',
  image_url text,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.uniform_packages(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  is_required boolean not null default true,
  requires_size boolean not null default true,
  selection_group text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.branch_packages (
  branch_id uuid not null references public.branches(id) on delete cascade,
  package_id uuid not null references public.uniform_packages(id) on delete cascade,
  branch_price numeric(12,2) check (branch_price is null or branch_price >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (branch_id, package_id)
);

create table public.branch_inventory (
  branch_id uuid not null,
  product_id uuid not null,
  variant_id uuid not null,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  updated_at timestamptz not null default now(),
  primary key (branch_id, variant_id),
  foreign key (branch_id, product_id) references public.branch_products(branch_id, product_id) on delete cascade,
  foreign key (variant_id, product_id) references public.product_variants(id, product_id) on delete cascade
);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity integer not null check (quantity <> 0),
  reference_type text, reference_id uuid, note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text, recipient_name text not null, phone text,
  address_line1 text not null, address_line2 text, city text not null,
  state text not null, postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_user_id uuid not null,
  student_id uuid,
  school_id uuid not null,
  branch_id uuid not null,
  status public.order_status not null default 'pending',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  grand_total numeric(12,2) not null default 0 check (grand_total >= 0),
  currency text not null default 'INR',
  shipping_address jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_user_id, school_id, branch_id) references public.profiles(id, school_id, branch_id) on delete restrict,
  foreign key (student_id, school_id, branch_id) references public.students(id, school_id, branch_id) on delete restrict,
  foreign key (branch_id, school_id) references public.branches(id, school_id) on delete restrict
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  package_id uuid references public.uniform_packages(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  item_name_snapshot text not null,
  selected_variants jsonb not null default '[]'::jsonb,
  inventory_allocations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check ((product_id is not null and package_id is null) or (product_id is null and package_id is not null))
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text, provider_payment_id text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'INR',
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, description text,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value >= 0),
  starts_at timestamptz, expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.branch_coupons (
  branch_id uuid not null references public.branches(id) on delete cascade,
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  primary key (branch_id, coupon_id)
);

create table public.order_coupons (
  order_id uuid primary key references public.orders(id) on delete cascade,
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  discount_amount numeric(12,2) not null check (discount_amount >= 0)
);

create table public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid references public.profiles(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  status text not null default 'open' check (status in ('open','pending','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_user_id uuid references public.profiles(id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

create index idx_branches_school_id on public.branches(school_id);
create index idx_profiles_school_branch on public.profiles(school_id, branch_id);
create index idx_profiles_branch_school on public.profiles(branch_id, school_id);
create index idx_students_school_branch on public.students(school_id, branch_id);
create index idx_students_branch_school on public.students(branch_id, school_id);
create index idx_students_user_id on public.students(user_id);
create index idx_parent_student_links_student on public.parent_student_links(student_id);
create index idx_products_category on public.products(category_id);
create index idx_product_variants_product on public.product_variants(product_id);
create index idx_branch_products_product on public.branch_products(product_id);
create index idx_package_items_package on public.package_items(package_id);
create index idx_package_items_product on public.package_items(product_id);
create index idx_branch_packages_package on public.branch_packages(package_id);
create index idx_inventory_transactions_branch_variant on public.inventory_transactions(branch_id, variant_id);
create index idx_inventory_transactions_variant_id on public.inventory_transactions(variant_id);
create index idx_inventory_transactions_created_by on public.inventory_transactions(created_by);
create index idx_branch_inventory_branch_product on public.branch_inventory(branch_id, product_id);
create index idx_branch_inventory_variant_product on public.branch_inventory(variant_id, product_id);
create index idx_customer_addresses_user_id on public.customer_addresses(user_id);
create index idx_orders_customer on public.orders(customer_user_id);
create index idx_orders_branch_status on public.orders(branch_id, status);
create index idx_orders_branch_school on public.orders(branch_id, school_id);
create index idx_orders_customer_scope on public.orders(customer_user_id, school_id, branch_id);
create index idx_orders_student_scope on public.orders(student_id, school_id, branch_id);
create index idx_order_items_order on public.order_items(order_id);
create index idx_order_items_product_id on public.order_items(product_id);
create index idx_order_items_package_id on public.order_items(package_id);
create index idx_payments_order on public.payments(order_id);
create index idx_branch_coupons_coupon_id on public.branch_coupons(coupon_id);
create index idx_order_coupons_coupon_id on public.order_coupons(coupon_id);
create index idx_support_conversations_customer on public.support_conversations(customer_user_id);
create index idx_support_conversations_branch_id on public.support_conversations(branch_id);
create index idx_support_conversations_school_id on public.support_conversations(school_id);
create index idx_support_messages_conversation on public.support_messages(conversation_id);
create index idx_support_messages_sender_user_id on public.support_messages(sender_user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger schools_set_updated_at before update on public.schools for each row execute function public.set_updated_at();
create trigger branches_set_updated_at before update on public.branches for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger students_set_updated_at before update on public.students for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger branch_products_set_updated_at before update on public.branch_products for each row execute function public.set_updated_at();
create trigger uniform_packages_set_updated_at before update on public.uniform_packages for each row execute function public.set_updated_at();
create trigger branch_packages_set_updated_at before update on public.branch_packages for each row execute function public.set_updated_at();
create trigger branch_inventory_set_updated_at before update on public.branch_inventory for each row execute function public.set_updated_at();
create trigger customer_addresses_set_updated_at before update on public.customer_addresses for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger support_conversations_set_updated_at before update on public.support_conversations for each row execute function public.set_updated_at();
create trigger support_messages_set_updated_at before update on public.support_messages for each row execute function public.set_updated_at();

create or replace function app_private.current_user_role()
returns public.account_role language sql security definer stable set search_path = ''
as $$ select p.role from public.profiles p where p.id = (select auth.uid()) limit 1 $$;

create or replace function app_private.current_user_school_id()
returns uuid language sql security definer stable set search_path = ''
as $$ select p.school_id from public.profiles p where p.id = (select auth.uid()) limit 1 $$;

create or replace function app_private.current_user_branch_id()
returns uuid language sql security definer stable set search_path = ''
as $$ select p.branch_id from public.profiles p where p.id = (select auth.uid()) limit 1 $$;

create or replace function app_private.current_user_login_id()
returns text language sql security definer stable set search_path = ''
as $$ select p.login_id from public.profiles p where p.id = (select auth.uid()) limit 1 $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name',''), 'customer', new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function app_private.current_user_role() from public, anon;
revoke execute on function app_private.current_user_school_id() from public, anon;
revoke execute on function app_private.current_user_branch_id() from public, anon;
revoke execute on function app_private.current_user_login_id() from public, anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.current_user_role() to authenticated;
grant execute on function app_private.current_user_school_id() to authenticated;
grant execute on function app_private.current_user_branch_id() to authenticated;
grant execute on function app_private.current_user_login_id() to authenticated;

alter default privileges for role postgres in schema public revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke usage, select, update on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated, service_role;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.schools, public.branches to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.schools enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.branch_products enable row level security;
alter table public.uniform_packages enable row level security;
alter table public.package_items enable row level security;
alter table public.branch_packages enable row level security;
alter table public.branch_inventory enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.coupons enable row level security;
alter table public.branch_coupons enable row level security;
alter table public.order_coupons enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

create policy schools_public_read on public.schools for select to anon, authenticated
using (status = 'active' or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager'));
create policy schools_admin_manage on public.schools for all to authenticated
using ((select app_private.current_user_role()) = 'admin')
with check ((select app_private.current_user_role()) = 'admin');

create policy branches_public_read on public.branches for select to anon, authenticated
using (status = 'active');

create policy branches_scoped_read on public.branches for select to authenticated
using ((select app_private.current_user_role()) = 'admin' or school_id = (select app_private.current_user_school_id()));
create policy branches_admin_manage on public.branches for all to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager') and ((select app_private.current_user_role()) = 'admin' or school_id = (select app_private.current_user_school_id())))
with check ((select app_private.current_user_role()) in ('admin','school_manager') and ((select app_private.current_user_role()) = 'admin' or school_id = (select app_private.current_user_school_id())));

create policy profiles_self_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select app_private.current_user_role()) = 'admin' or (school_id = (select app_private.current_user_school_id()) and (select app_private.current_user_role()) in ('school_manager','branch_manager')));
create policy profiles_self_update on public.profiles for update to authenticated
using (id = (select auth.uid()) and role = 'customer')
with check (id = (select auth.uid()) and role = 'customer' and school_id is not distinct from (select app_private.current_user_school_id()) and branch_id is not distinct from (select app_private.current_user_branch_id()) and login_id is not distinct from (select app_private.current_user_login_id()));
create policy profiles_admin_manage on public.profiles for all to authenticated
using ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or branch_id = (select app_private.current_user_branch_id()))))
with check ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or branch_id = (select app_private.current_user_branch_id()))));

create policy students_customer_read on public.students for select to authenticated
using (user_id = (select auth.uid()) or exists (select 1 from public.parent_student_links psl where psl.student_id = students.id and psl.parent_user_id = (select auth.uid())) or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager'));
create policy students_staff_manage on public.students for all to authenticated
using ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or branch_id = (select app_private.current_user_branch_id()))))
with check ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or branch_id = (select app_private.current_user_branch_id()))));

create policy categories_staff_read on public.product_categories for select to authenticated using ((select app_private.current_user_role()) is not null);
create policy categories_admin_manage on public.product_categories for all to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager'))
with check ((select app_private.current_user_role()) in ('admin','school_manager'));

create policy products_catalog_read on public.products for select to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager') or exists (select 1 from public.branch_products bp where bp.product_id = products.id and bp.branch_id = (select app_private.current_user_branch_id()) and bp.is_visible));
create policy products_staff_manage on public.products for all to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager'))
with check ((select app_private.current_user_role()) in ('admin','school_manager'));

create policy variants_catalog_read on public.product_variants for select to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager') or exists (select 1 from public.branch_products bp where bp.product_id = product_variants.product_id and bp.branch_id = (select app_private.current_user_branch_id()) and bp.is_visible));
create policy variants_staff_manage on public.product_variants for all to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager'))
with check ((select app_private.current_user_role()) in ('admin','school_manager'));

create policy branch_products_catalog_read on public.branch_products for select to authenticated
using ((branch_id = (select app_private.current_user_branch_id()) and is_visible) or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager'));
create policy branch_products_staff_manage on public.branch_products for all to authenticated
using ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and branch_id in (select b.id from public.branches b where b.school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or b.id = (select app_private.current_user_branch_id())))))
with check ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and branch_id in (select b.id from public.branches b where b.school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or b.id = (select app_private.current_user_branch_id())))));

create policy packages_catalog_read on public.uniform_packages for select to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager') or exists (select 1 from public.branch_packages bp where bp.package_id = uniform_packages.id and bp.branch_id = (select app_private.current_user_branch_id()) and bp.is_visible));
create policy packages_staff_manage on public.uniform_packages for all to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager'))
with check ((select app_private.current_user_role()) in ('admin','school_manager'));

create policy package_items_catalog_read on public.package_items for select to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager') or exists (select 1 from public.branch_packages bp where bp.package_id = package_items.package_id and bp.branch_id = (select app_private.current_user_branch_id()) and bp.is_visible));
create policy package_items_staff_manage on public.package_items for all to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager'))
with check ((select app_private.current_user_role()) in ('admin','school_manager'));

create policy branch_packages_catalog_read on public.branch_packages for select to authenticated
using ((branch_id = (select app_private.current_user_branch_id()) and is_visible) or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager'));
create policy branch_packages_staff_manage on public.branch_packages for all to authenticated
using ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and exists (select 1 from public.branches b where b.id = branch_packages.branch_id and b.school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or b.id = (select app_private.current_user_branch_id())))))
with check ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and exists (select 1 from public.branches b where b.id = branch_packages.branch_id and b.school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or b.id = (select app_private.current_user_branch_id())))));

create policy inventory_staff_access on public.branch_inventory for all to authenticated
using ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and branch_id in (select b.id from public.branches b where b.school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or b.id = (select app_private.current_user_branch_id())))))
with check ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and branch_id in (select b.id from public.branches b where b.school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or b.id = (select app_private.current_user_branch_id())))));

create policy inventory_tx_staff on public.inventory_transactions for all to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager') and ((select app_private.current_user_role()) = 'admin' or branch_id = (select app_private.current_user_branch_id()) or ((select app_private.current_user_role()) = 'school_manager' and exists (select 1 from public.branches b where b.id = inventory_transactions.branch_id and b.school_id = (select app_private.current_user_school_id())))))
with check ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager') and ((select app_private.current_user_role()) = 'admin' or branch_id = (select app_private.current_user_branch_id()) or ((select app_private.current_user_role()) = 'school_manager' and exists (select 1 from public.branches b where b.id = inventory_transactions.branch_id and b.school_id = (select app_private.current_user_school_id())))));

create policy addresses_self on public.customer_addresses for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy orders_customer_read on public.orders for select to authenticated
using (customer_user_id = (select auth.uid()) or (select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or branch_id = (select app_private.current_user_branch_id()))));
create policy orders_customer_insert on public.orders for insert to authenticated
with check (customer_user_id = (select auth.uid()) and school_id = (select app_private.current_user_school_id()) and branch_id = (select app_private.current_user_branch_id()));
create policy orders_staff_update on public.orders for update to authenticated
using ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or branch_id = (select app_private.current_user_branch_id()))))
with check ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or branch_id = (select app_private.current_user_branch_id()))));

create policy order_items_read on public.order_items for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_items.order_id and (o.customer_user_id = (select auth.uid()) or (select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and o.school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or o.branch_id = (select app_private.current_user_branch_id()))))));
create policy order_items_staff_manage on public.order_items for all to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager'))
with check ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager'));

create policy payments_read on public.payments for select to authenticated
using (exists (select 1 from public.orders o where o.id = payments.order_id and (o.customer_user_id = (select auth.uid()) or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager'))));
create policy payments_staff_manage on public.payments for all to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager'))
with check ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager'));

create policy coupons_customer_read on public.coupons for select to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager') or exists (select 1 from public.branch_coupons bc where bc.coupon_id = coupons.id and bc.branch_id = (select app_private.current_user_branch_id())));
create policy coupons_staff_manage on public.coupons for all to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager'))
with check ((select app_private.current_user_role()) in ('admin','school_manager'));

create policy branch_coupons_access on public.branch_coupons for select to authenticated
using (branch_id = (select app_private.current_user_branch_id()) or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager'));
create policy branch_coupons_staff_manage on public.branch_coupons for all to authenticated
using ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and exists (select 1 from public.branches b where b.id = branch_coupons.branch_id and b.school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or b.id = (select app_private.current_user_branch_id())))))
with check ((select app_private.current_user_role()) = 'admin' or ((select app_private.current_user_role()) in ('school_manager','branch_manager') and exists (select 1 from public.branches b where b.id = branch_coupons.branch_id and b.school_id = (select app_private.current_user_school_id()) and ((select app_private.current_user_role()) = 'school_manager' or b.id = (select app_private.current_user_branch_id())))));

create policy order_coupons_read on public.order_coupons for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_coupons.order_id and (o.customer_user_id = (select auth.uid()) or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager'))));

create policy support_conversations_customer_read on public.support_conversations for select to authenticated
using (customer_user_id = (select auth.uid()) or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager'));
create policy support_conversations_customer_insert on public.support_conversations for insert to authenticated
with check (customer_user_id = (select auth.uid()) and school_id = (select app_private.current_user_school_id()) and branch_id = (select app_private.current_user_branch_id()));
create policy support_conversations_staff_manage on public.support_conversations for update to authenticated
using ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager'))
with check ((select app_private.current_user_role()) in ('admin','school_manager','branch_manager'));

create policy support_messages_read on public.support_messages for select to authenticated
using (exists (select 1 from public.support_conversations c where c.id = support_messages.conversation_id and (c.customer_user_id = (select auth.uid()) or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager'))));
create policy support_messages_insert on public.support_messages for insert to authenticated
with check (sender_user_id = (select auth.uid()) and exists (select 1 from public.support_conversations c where c.id = support_messages.conversation_id and (c.customer_user_id = (select auth.uid()) or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager'))));

-- Customer-facing school isolation is enforced by both application scope and RLS.
