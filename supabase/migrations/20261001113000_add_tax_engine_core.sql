-- Tax Engine Core: extends the existing School Uniforms commerce model.
create table if not exists public.tax_classes (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  description text, is_default boolean not null default false, is_exempt boolean not null default false,
  is_zero_rated boolean not null default false, status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(), tax_class_id uuid not null references public.tax_classes(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete cascade, country_code text not null default 'IN', state_code text,
  rate numeric(8,4) not null default 0 check (rate >= 0 and rate <= 100), cgst_rate numeric(8,4) not null default 0 check (cgst_rate >= 0 and cgst_rate <= 100),
  sgst_rate numeric(8,4) not null default 0 check (sgst_rate >= 0 and sgst_rate <= 100), igst_rate numeric(8,4) not null default 0 check (igst_rate >= 0 and igst_rate <= 100),
  cess_rate numeric(8,4) not null default 0 check (cess_rate >= 0 and cess_rate <= 100), hsn_prefix text,
  effective_from timestamptz not null default now(), effective_to timestamptz, priority integer not null default 0,
  status text not null default 'active' check (status in ('active','inactive')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);
create index if not exists idx_tax_rates_lookup on public.tax_rates(tax_class_id, branch_id, country_code, state_code, status, effective_from desc);
alter table public.products add column if not exists tax_class_id uuid references public.tax_classes(id) on delete restrict, add column if not exists hsn_code text, add column if not exists tax_inclusive boolean not null default false;
alter table public.product_variants add column if not exists tax_class_id uuid references public.tax_classes(id) on delete restrict;
alter table public.orders add column if not exists tax_total numeric(14,2) not null default 0, add column if not exists taxable_total numeric(14,2) not null default 0, add column if not exists tax_inclusive boolean not null default false, add column if not exists tax_breakdown jsonb not null default '{}'::jsonb;
alter table public.order_items add column if not exists tax_class_id uuid references public.tax_classes(id) on delete restrict, add column if not exists tax_rate_id uuid references public.tax_rates(id) on delete restrict, add column if not exists taxable_amount numeric(14,2) not null default 0, add column if not exists tax_amount numeric(14,2) not null default 0, add column if not exists tax_breakdown jsonb not null default '{}'::jsonb;
create table if not exists public.order_tax_lines (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade, tax_class_id uuid references public.tax_classes(id) on delete restrict,
  tax_rate_id uuid references public.tax_rates(id) on delete restrict, jurisdiction text, taxable_amount numeric(14,2) not null default 0,
  cgst_amount numeric(14,2) not null default 0, sgst_amount numeric(14,2) not null default 0, igst_amount numeric(14,2) not null default 0,
  cess_amount numeric(14,2) not null default 0, total_tax numeric(14,2) not null default 0, rate_snapshot numeric(8,4) not null default 0,
  components_snapshot jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists idx_order_tax_lines_order on public.order_tax_lines(order_id);
create index if not exists idx_order_tax_lines_item on public.order_tax_lines(order_item_id);
create table if not exists public.tax_rate_history (
  id uuid primary key default gen_random_uuid(), tax_rate_id uuid not null references public.tax_rates(id) on delete cascade,
  old_values jsonb not null, new_values jsonb not null, changed_by uuid references public.profiles(id) on delete set null, changed_at timestamptz not null default now()
);
create or replace function public.calculate_gst_breakdown(p_tax_class_id uuid,p_taxable_amount numeric,p_origin_state text,p_destination_state text,p_branch_id uuid default null,p_at timestamptz default now()) returns jsonb language plpgsql stable set search_path = pg_catalog, public, app_private as $$
declare r public.tax_rates%rowtype; v_intra boolean; v_cgst numeric:=0; v_sgst numeric:=0; v_igst numeric:=0; v_cess numeric:=0; v_total numeric:=0;
begin
 if p_taxable_amount<=0 then return jsonb_build_object('taxable_amount',0,'cgst',0,'sgst',0,'igst',0,'cess',0,'total_tax',0); end if;
 select tr.* into r from public.tax_rates tr where tr.tax_class_id=p_tax_class_id and tr.status='active' and tr.country_code='IN' and tr.effective_from<=p_at and (tr.effective_to is null or tr.effective_to>p_at) and (tr.branch_id=p_branch_id or tr.branch_id is null) and (tr.state_code is null or upper(tr.state_code)=upper(coalesce(p_destination_state,''))) order by case when tr.branch_id=p_branch_id then 0 else 1 end, case when tr.state_code is not null then 0 else 1 end, tr.priority desc, tr.effective_from desc limit 1;
 if not found then return jsonb_build_object('taxable_amount',round(p_taxable_amount,2),'cgst',0,'sgst',0,'igst',0,'cess',0,'total_tax',0,'rate',0,'jurisdiction','none'); end if;
 v_intra:=upper(coalesce(p_origin_state,''))<>'' and upper(coalesce(p_destination_state,''))<>'' and upper(p_origin_state)=upper(p_destination_state);
 if v_intra then v_cgst:=round(p_taxable_amount*r.cgst_rate/100,2); v_sgst:=round(p_taxable_amount*r.sgst_rate/100,2); else v_igst:=round(p_taxable_amount*r.igst_rate/100,2); end if;
 v_cess:=round(p_taxable_amount*r.cess_rate/100,2); v_total:=v_cgst+v_sgst+v_igst+v_cess;
 return jsonb_build_object('taxable_amount',round(p_taxable_amount,2),'rate',r.rate,'cgst_rate',r.cgst_rate,'sgst_rate',r.sgst_rate,'igst_rate',r.igst_rate,'cess_rate',r.cess_rate,'cgst',v_cgst,'sgst',v_sgst,'igst',v_igst,'cess',v_cess,'total_tax',v_total,'jurisdiction',case when v_intra then 'intra_state' else 'inter_state' end,'tax_rate_id',r.id);
end; $$;
insert into public.tax_classes(name,slug,description,is_default) values ('Standard','standard','Default taxable goods class',true) on conflict (slug) do nothing;
insert into public.tax_classes(name,slug,description,is_zero_rated) values ('Zero Rated','zero-rated','Zero-rated supplies',true) on conflict (slug) do nothing;
insert into public.tax_classes(name,slug,description,is_exempt) values ('Exempt','exempt','GST-exempt supplies',true) on conflict (slug) do nothing;
update public.products set tax_class_id=(select id from public.tax_classes where slug='standard') where tax_class_id is null;
update public.product_variants set tax_class_id=p.tax_class_id from public.products p where p.id=product_variants.product_id and product_variants.tax_class_id is null;
alter table public.tax_classes enable row level security;
alter table public.tax_rates enable row level security;
alter table public.order_tax_lines enable row level security;
alter table public.tax_rate_history enable row level security;
create policy tax_classes_read on public.tax_classes for select to authenticated using ((select app_private.current_user_role())=any(array['admin'::account_role,'school_manager'::account_role,'branch_manager'::account_role]));
create policy tax_classes_manage on public.tax_classes for all to authenticated using ((select app_private.current_user_role())=any(array['admin'::account_role,'school_manager'::account_role])) with check ((select app_private.current_user_role())=any(array['admin'::account_role,'school_manager'::account_role]));
create policy tax_rates_read on public.tax_rates for select to authenticated using ((select app_private.current_user_role())=any(array['admin'::account_role,'school_manager'::account_role,'branch_manager'::account_role]));
create policy tax_rates_manage on public.tax_rates for all to authenticated using ((select app_private.current_user_role())=any(array['admin'::account_role,'school_manager'::account_role])) with check ((select app_private.current_user_role())=any(array['admin'::account_role,'school_manager'::account_role]));
create policy order_tax_lines_read on public.order_tax_lines for select to authenticated using (exists(select 1 from public.orders o where o.id=order_tax_lines.order_id and (o.customer_user_id=(select auth.uid()) or app_private.can_manage_branch(o.branch_id))));
create policy order_tax_lines_manage on public.order_tax_lines for all to authenticated using ((select app_private.current_user_role())=any(array['admin'::account_role,'school_manager'::account_role,'branch_manager'::account_role])) with check ((select app_private.current_user_role())=any(array['admin'::account_role,'school_manager'::account_role,'branch_manager'::account_role]));
create policy tax_rate_history_read on public.tax_rate_history for select to authenticated using ((select app_private.current_user_role())=any(array['admin'::account_role,'school_manager'::account_role,'branch_manager'::account_role]));
create policy tax_rate_history_insert on public.tax_rate_history for insert to authenticated with check ((select app_private.current_user_role())=any(array['admin'::account_role,'school_manager'::account_role]));
grant execute on function public.calculate_gst_breakdown(uuid,numeric,text,text,uuid,timestamptz) to authenticated;
