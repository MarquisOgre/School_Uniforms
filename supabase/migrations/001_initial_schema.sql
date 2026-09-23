-- School Uniform Portal
-- Foundation schema: multi-school isolation, catalog, bundles and orders.
-- Apply this migration to a fresh Supabase project.

create extension if not exists pgcrypto;

create type public.account_role as enum ('admin', 'school_manager', 'customer');
create type public.record_status as enum ('active', 'inactive', 'suspended');
create type public.gender_type as enum ('boys', 'girls', 'unisex');
create type public.order_status as enum ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  logo_url text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.account_role not null default 'customer',
  school_id uuid references public.schools(id) on delete restrict,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  parent_user_id uuid references public.profiles(id) on delete set null,
  student_code text not null,
  full_name text not null,
  class_name text,
  section text,
  gender public.gender_type not null,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (school_id, student_code)
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  gender public.gender_type not null default 'unisex',
  image_url text,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  size_label text not null,
  color text,
  price numeric(12,2),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (product_id, size_label, color)
);

create table public.school_products (
  school_id uuid not null references public.schools(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  school_price numeric(12,2) check (school_price >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (school_id, product_id)
);

create table public.uniform_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  gender public.gender_type not null,
  description text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.uniform_packages(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  size_required boolean not null default true,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  unique (package_id, product_id)
);

create table public.school_packages (
  school_id uuid not null references public.schools(id) on delete cascade,
  package_id uuid not null references public.uniform_packages(id) on delete cascade,
  school_price numeric(12,2) check (school_price >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (school_id, package_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  school_id uuid not null references public.schools(id) on delete restrict,
  customer_user_id uuid not null references public.profiles(id) on delete restrict,
  student_id uuid references public.students(id) on delete set null,
  status public.order_status not null default 'pending',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  package_id uuid references public.uniform_packages(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  selected_sizes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check ((product_id is not null) <> (package_id is not null))
);

create index idx_profiles_school on public.profiles(school_id);
create index idx_students_school on public.students(school_id);
create index idx_school_products_product on public.school_products(product_id);
create index idx_school_packages_package on public.school_packages(package_id);
create index idx_orders_school on public.orders(school_id);
create index idx_orders_customer on public.orders(customer_user_id);

-- Security helper avoids recursive policy evaluation on profiles.
create or replace function public.current_user_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns public.account_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.school_products enable row level security;
alter table public.uniform_packages enable row level security;
alter table public.package_items enable row level security;
alter table public.school_packages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- The login page needs an active-school list before authentication.
create policy "anyone can view active schools"
on public.schools for select
to anon, authenticated
using (status = 'active');

create policy "admins manage schools"
on public.schools for all
to authenticated
using (public.current_user_role() in ('admin','school_manager'))
with check (public.current_user_role() in ('admin','school_manager'));

create policy "users view own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "admins manage profiles"
on public.profiles for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "users view own school students"
on public.students for select
to authenticated
using (school_id = public.current_user_school_id() and (parent_user_id = auth.uid() or public.current_user_role() in ('admin','school_manager')));

create policy "admins manage students"
on public.students for all
to authenticated
using (public.current_user_role() in ('admin','school_manager'))
with check (public.current_user_role() in ('admin','school_manager'));

create policy "authenticated users view categories"
on public.product_categories for select
to authenticated
using (true);

create policy "school users view catalog products"
on public.products for select
to authenticated
using (
  exists (
    select 1 from public.school_products sp
    where sp.product_id = products.id
      and sp.school_id = public.current_user_school_id()
      and sp.is_visible = true
  )
);

create policy "admins manage products"
on public.products for all
to authenticated
using (public.current_user_role() in ('admin','school_manager'))
with check (public.current_user_role() in ('admin','school_manager'));

create policy "school users view product variants"
on public.product_variants for select
to authenticated
using (
  exists (
    select 1 from public.school_products sp
    where sp.product_id = product_variants.product_id
      and sp.school_id = public.current_user_school_id()
      and sp.is_visible = true
  )
);

create policy "admins manage product variants"
on public.product_variants for all
to authenticated
using (public.current_user_role() in ('admin','school_manager'))
with check (public.current_user_role() in ('admin','school_manager'));

create policy "school users view school products"
on public.school_products for select
to authenticated
using (school_id = public.current_user_school_id());

create policy "admins manage school products"
on public.school_products for all
to authenticated
using (public.current_user_role() in ('admin','school_manager'))
with check (public.current_user_role() in ('admin','school_manager'));

create policy "school users view packages"
on public.uniform_packages for select
to authenticated
using (
  exists (
    select 1 from public.school_packages sp
    where sp.package_id = uniform_packages.id
      and sp.school_id = public.current_user_school_id()
      and sp.is_visible = true
  )
);

create policy "admins manage packages"
on public.uniform_packages for all
to authenticated
using (public.current_user_role() in ('admin','school_manager'))
with check (public.current_user_role() in ('admin','school_manager'));

create policy "school users view package items"
on public.package_items for select
to authenticated
using (
  exists (
    select 1 from public.school_packages sp
    where sp.package_id = package_items.package_id
      and sp.school_id = public.current_user_school_id()
      and sp.is_visible = true
  )
);

create policy "admins manage package items"
on public.package_items for all
to authenticated
using (public.current_user_role() in ('admin','school_manager'))
with check (public.current_user_role() in ('admin','school_manager'));

create policy "school users view school packages"
on public.school_packages for select
to authenticated
using (school_id = public.current_user_school_id());

create policy "admins manage school packages"
on public.school_packages for all
to authenticated
using (public.current_user_role() in ('admin','school_manager'))
with check (public.current_user_role() in ('admin','school_manager'));

create policy "customers view own school orders"
on public.orders for select
to authenticated
using (customer_user_id = auth.uid() and school_id = public.current_user_school_id());

create policy "customers create own school orders"
on public.orders for insert
to authenticated
with check (customer_user_id = auth.uid() and school_id = public.current_user_school_id());

create policy "admins manage orders"
on public.orders for all
to authenticated
using (public.current_user_role() in ('admin','school_manager'))
with check (public.current_user_role() in ('admin','school_manager'));

create policy "customers view own order items"
on public.order_items for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.customer_user_id = auth.uid()
      and o.school_id = public.current_user_school_id()
  )
);

create policy "customers create own order items"
on public.order_items for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.customer_user_id = auth.uid()
      and o.school_id = public.current_user_school_id()
  )
);

create policy "admins manage order items"
on public.order_items for all
to authenticated
using (public.current_user_role() in ('admin','school_manager'))
with check (public.current_user_role() in ('admin','school_manager'));
