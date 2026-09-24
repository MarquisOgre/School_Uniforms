-- School Uniforms: production checkout, payments, reservations and package inventory allocation.
-- This migration is already applied to the linked project; keep it in source control for reproducible environments.

create sequence if not exists public.school_order_number_seq start 1;

create table if not exists public.branch_payment_settings (
  branch_id uuid primary key references public.branches(id) on delete cascade,
  pay_at_school_enabled boolean not null default true,
  upi_enabled boolean not null default false,
  upi_id text,
  upi_payee_name text,
  shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0),
  free_shipping_above numeric(12,2) not null default 0 check (free_shipping_above >= 0),
  updated_at timestamptz not null default now()
);

alter table public.branch_payment_settings enable row level security;
revoke all on table public.branch_payment_settings from anon, authenticated;
grant select,insert,update,delete on table public.branch_payment_settings to authenticated;

drop policy if exists branch_payment_settings_customer_read on public.branch_payment_settings;
create policy branch_payment_settings_customer_read on public.branch_payment_settings
for select to authenticated using (
  branch_id = (select app_private.current_user_branch_id())
  or (select app_private.current_user_role()) in ('admin','school_manager','branch_manager')
);

drop policy if exists branch_payment_settings_staff_manage on public.branch_payment_settings;
create policy branch_payment_settings_staff_manage on public.branch_payment_settings
for all to authenticated
using (
  (select app_private.current_user_role()) = 'admin'
  or (
    (select app_private.current_user_role()) in ('school_manager','branch_manager')
    and exists (
      select 1 from public.branches b
      where b.id = branch_payment_settings.branch_id
        and b.school_id = (select app_private.current_user_school_id())
        and ((select app_private.current_user_role()) = 'school_manager' or b.id = (select app_private.current_user_branch_id()))
    )
  )
)
with check (
  (select app_private.current_user_role()) = 'admin'
  or (
    (select app_private.current_user_role()) in ('school_manager','branch_manager')
    and exists (
      select 1 from public.branches b
      where b.id = branch_payment_settings.branch_id
        and b.school_id = (select app_private.current_user_school_id())
        and ((select app_private.current_user_role()) = 'school_manager' or b.id = (select app_private.current_user_branch_id()))
    )
  )
);

create or replace function public.set_branch_payment_settings_updated_at()
returns trigger language plpgsql set search_path=''
as $$ begin new.updated_at=now(); return new; end $$;

drop trigger if exists branch_payment_settings_set_updated_at on public.branch_payment_settings;
create trigger branch_payment_settings_set_updated_at
before update on public.branch_payment_settings
for each row execute function public.set_branch_payment_settings_updated_at();

create or replace function public.place_school_order(
  p_school_id uuid,p_branch_id uuid,p_student_id uuid,p_items jsonb,p_shipping_address jsonb,
  p_payment_method text,p_payment_reference text default null,p_notes text default null
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid:=(select auth.uid()); v_profile_school uuid; v_profile_branch uuid; v_role text;
  v_student_id uuid:=p_student_id; v_student_count integer; v_item jsonb; v_selected jsonb;
  v_type text; v_source_id uuid; v_quantity integer; v_unit_price numeric(12,2); v_line_total numeric(12,2);
  v_name text; v_variant_id uuid; v_package_item_id uuid; v_requires_size boolean; v_alloc_qty integer;
  v_order_id uuid; v_order_number text; v_subtotal numeric(12,2):=0; v_shipping_fee numeric(12,2):=0;
  v_free_shipping_above numeric(12,2):=0; v_grand_total numeric(12,2):=0; v_item_allocations jsonb; v_alloc jsonb;
begin
  if v_user_id is null then raise exception 'You must be signed in to place an order.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Your cart is empty.'; end if;
  if jsonb_array_length(p_items)>50 then raise exception 'Your cart contains too many line items.'; end if;
  if p_shipping_address is null or jsonb_typeof(p_shipping_address)<>'object' then raise exception 'A delivery address is required.'; end if;
  if p_payment_method not in ('upi','pay_at_school') then raise exception 'Unsupported payment method.'; end if;

  select p.school_id,p.branch_id,p.role into v_profile_school,v_profile_branch,v_role
  from public.profiles p where p.id=v_user_id and p.status='active' limit 1;
  if v_profile_school is null or v_profile_branch is null or v_role<>'customer' then raise exception 'Your account is not eligible to place school orders.'; end if;
  if v_profile_school<>p_school_id or v_profile_branch<>p_branch_id then raise exception 'The selected school or branch does not match your signed-in account.'; end if;
  if not exists(select 1 from public.branches b where b.id=p_branch_id and b.school_id=p_school_id and b.status='active') then raise exception 'The selected school branch is not active.'; end if;

  if v_student_id is not null then
    if not exists(select 1 from public.students s where s.id=v_student_id and s.school_id=p_school_id and s.branch_id=p_branch_id and s.status='active' and (s.user_id=v_user_id or exists(select 1 from public.parent_student_links psl where psl.student_id=s.id and psl.parent_user_id=v_user_id))) then raise exception 'The selected student is not linked to your account.'; end if;
  else
    select count(*),min(s.id) into v_student_count,v_student_id
    from public.students s where s.school_id=p_school_id and s.branch_id=p_branch_id and s.status='active'
      and (s.user_id=v_user_id or exists(select 1 from public.parent_student_links psl where psl.student_id=s.id and psl.parent_user_id=v_user_id));
    if v_student_count=0 then raise exception 'No active student is linked to this account.';
    elsif v_student_count>1 then raise exception 'Please select the student for this order.'; end if;
  end if;

  select coalesce(bps.shipping_fee,0),coalesce(bps.free_shipping_above,0) into v_shipping_fee,v_free_shipping_above
  from public.branch_payment_settings bps where bps.branch_id=p_branch_id;

  if p_payment_method='upi' then
    if not exists(select 1 from public.branch_payment_settings bps where bps.branch_id=p_branch_id and bps.upi_enabled and nullif(trim(bps.upi_id),'') is not null) then raise exception 'UPI payment is not enabled for this branch.'; end if;
    if nullif(trim(coalesce(p_payment_reference,'')),'') is null then raise exception 'Please enter the UPI transaction/reference ID.'; end if;
  elsif not exists(select 1 from public.branch_payment_settings bps where bps.branch_id=p_branch_id and bps.pay_at_school_enabled) then raise exception 'Pay at School is not enabled for this branch.'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_type:=lower(trim(coalesce(v_item->>'type',''))); v_quantity:=coalesce((v_item->>'quantity')::integer,0);
    if v_quantity<1 or v_quantity>100 then raise exception 'Invalid item quantity.'; end if;
    v_source_id:=nullif(v_item->>'source_id','')::uuid; v_selected:=coalesce(v_item->'selected_variants','[]'::jsonb); v_item_allocations:='[]'::jsonb;

    if v_type='product' then
      select coalesce(bp.branch_price,pv.price,p.base_price,0),p.name into v_unit_price,v_name
      from public.branch_products bp join public.products p on p.id=bp.product_id
      left join lateral(select pv2.price from public.product_variants pv2 where pv2.id=nullif(v_selected->0->>'variant_id','')::uuid and pv2.product_id=p.id and pv2.status='active' limit 1) pv on true
      where bp.branch_id=p_branch_id and bp.product_id=v_source_id and bp.is_visible and p.status='active' limit 1;
      if v_name is null then raise exception 'One of the products is no longer available for this branch.'; end if;
      v_variant_id:=nullif(v_selected->0->>'variant_id','')::uuid;
      if v_variant_id is null then raise exception 'Please select a size for %.',v_name; end if;
      if not exists(select 1 from public.product_variants pv2 where pv2.id=v_variant_id and pv2.product_id=v_source_id and pv2.status='active') then raise exception 'The selected size for % is no longer available.',v_name; end if;
    elsif v_type='package' then
      select coalesce(bp.branch_price,up.base_price,0),up.name into v_unit_price,v_name
      from public.branch_packages bp join public.uniform_packages up on up.id=bp.package_id
      where bp.branch_id=p_branch_id and bp.package_id=v_source_id and bp.is_visible and up.status='active' limit 1;
      if v_name is null then raise exception 'One of the packages is no longer available for this branch.'; end if;
      for v_package_item_id,v_source_id,v_alloc_qty,v_requires_size in
        select pi.id,pi.product_id,pi.quantity*v_quantity,pi.requires_size from public.package_items pi where pi.package_id=nullif(v_item->>'source_id','')::uuid
      loop
        if v_requires_size then
          select nullif(sv->>'variant_id','')::uuid into v_variant_id from jsonb_array_elements(v_selected) sv where sv->>'package_item_id'=v_package_item_id::text limit 1;
          if v_variant_id is null then raise exception 'Please select a size for % in %.',(select p2.name from public.products p2 where p2.id=v_source_id),v_name; end if;
          if not exists(select 1 from public.product_variants pv2 where pv2.id=v_variant_id and pv2.product_id=v_source_id and pv2.status='active') then raise exception 'A selected package size is no longer available.'; end if;
        else
          select pv2.id into v_variant_id from public.product_variants pv2 where pv2.product_id=v_source_id and pv2.status='active' order by pv2.size_label nulls first limit 1;
          if v_variant_id is null then raise exception 'Product % has no active variant configured.',(select p2.name from public.products p2 where p2.id=v_source_id); end if;
        end if;
      end loop;
    else raise exception 'Invalid item type.'; end if;
    v_line_total:=round(v_unit_price*v_quantity,2); v_subtotal:=v_subtotal+v_line_total;
  end loop;

  if v_free_shipping_above>0 and v_subtotal>=v_free_shipping_above then v_shipping_fee:=0; end if;
  v_grand_total:=round(v_subtotal+coalesce(v_shipping_fee,0),2);
  v_order_number:='SU-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.school_order_number_seq')::text,6,'0');

  insert into public.orders(order_number,customer_user_id,student_id,school_id,branch_id,status,subtotal,discount_total,shipping_total,grand_total,currency,shipping_address,notes)
  values(v_order_number,v_user_id,v_student_id,p_school_id,p_branch_id,'pending',v_subtotal,0,coalesce(v_shipping_fee,0),v_grand_total,'INR',p_shipping_address,nullif(trim(coalesce(p_notes,'')),''))
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_type:=lower(trim(coalesce(v_item->>'type',''))); v_quantity:=(v_item->>'quantity')::integer; v_source_id:=nullif(v_item->>'source_id','')::uuid; v_selected:=coalesce(v_item->'selected_variants','[]'::jsonb); v_item_allocations:='[]'::jsonb;
    if v_type='product' then
      select coalesce(bp.branch_price,pv.price,p.base_price,0),p.name into v_unit_price,v_name
      from public.branch_products bp join public.products p on p.id=bp.product_id
      left join lateral(select pv2.price from public.product_variants pv2 where pv2.id=nullif(v_selected->0->>'variant_id','')::uuid and pv2.product_id=p.id and pv2.status='active' limit 1) pv on true
      where bp.branch_id=p_branch_id and bp.product_id=v_source_id and bp.is_visible and p.status='active' limit 1;
      v_item_allocations:=jsonb_build_array(jsonb_build_object('variant_id',nullif(v_selected->0->>'variant_id','')::uuid,'product_id',v_source_id,'quantity',v_quantity));
      insert into public.order_items(order_id,product_id,package_id,quantity,unit_price,item_name_snapshot,selected_variants,inventory_allocations) values(v_order_id,v_source_id,null,v_quantity,v_unit_price,v_name,v_selected,v_item_allocations);
    else
      select coalesce(bp.branch_price,up.base_price,0),up.name into v_unit_price,v_name
      from public.branch_packages bp join public.uniform_packages up on up.id=bp.package_id
      where bp.branch_id=p_branch_id and bp.package_id=v_source_id and bp.is_visible and up.status='active' limit 1;
      for v_package_item_id,v_source_id,v_alloc_qty,v_requires_size in
        select pi.id,pi.product_id,pi.quantity*v_quantity,pi.requires_size from public.package_items pi where pi.package_id=nullif(v_item->>'source_id','')::uuid
      loop
        if v_requires_size then
          select nullif(sv->>'variant_id','')::uuid into v_variant_id from jsonb_array_elements(v_selected) sv where sv->>'package_item_id'=v_package_item_id::text limit 1;
        else
          select pv2.id into v_variant_id from public.product_variants pv2 where pv2.product_id=v_source_id and pv2.status='active' order by pv2.size_label nulls first limit 1;
        end if;
        if v_variant_id is null then raise exception 'A package item is missing a valid variant selection.'; end if;
        v_item_allocations:=v_item_allocations||jsonb_build_array(jsonb_build_object('package_item_id',v_package_item_id,'variant_id',v_variant_id,'product_id',v_source_id,'quantity',v_alloc_qty));
      end loop;
      v_source_id:=nullif(v_item->>'source_id','')::uuid;
      insert into public.order_items(order_id,product_id,package_id,quantity,unit_price,item_name_snapshot,selected_variants,inventory_allocations) values(v_order_id,null,v_source_id,v_quantity,v_unit_price,v_name,v_selected,v_item_allocations);
    end if;
  end loop;

  for v_alloc in select jsonb_array_elements(oi.inventory_allocations) from public.order_items oi where oi.order_id=v_order_id
  loop
    v_variant_id:=nullif(v_alloc->>'variant_id','')::uuid; v_alloc_qty:=greatest(1,(v_alloc->>'quantity')::integer);
    update public.branch_inventory set quantity_on_hand=quantity_on_hand-v_alloc_qty where branch_id=p_branch_id and variant_id=v_variant_id and quantity_on_hand>=v_alloc_qty;
    if not found then raise exception 'Insufficient stock for %.',coalesce((select p3.name from public.products p3 where p3.id=nullif(v_alloc->>'product_id','')::uuid),'selected item'); end if;
    insert into public.inventory_transactions(branch_id,variant_id,movement_type,quantity,reference_type,reference_id,note,created_by) values(p_branch_id,v_variant_id,'reservation',-v_alloc_qty,'order',v_order_id,'Reserved for school order '||v_order_number,v_user_id);
  end loop;

  insert into public.payments(order_id,provider,provider_payment_id,amount,currency,status,paid_at,metadata)
  values(v_order_id,case when p_payment_method='upi' then 'manual_upi' else 'school' end,nullif(trim(coalesce(p_payment_reference,'')),''),v_grand_total,'INR','pending',null,jsonb_build_object('payment_method',p_payment_method,'reference',nullif(trim(coalesce(p_payment_reference,'')),'')));

  return jsonb_build_object('order_id',v_order_id,'order_number',v_order_number,'student_id',v_student_id,'subtotal',v_subtotal,'shipping',coalesce(v_shipping_fee,0),'grand_total',v_grand_total,'payment_status','pending');
end;
$$;

revoke all on function public.place_school_order(uuid,uuid,uuid,jsonb,jsonb,text,text,text) from public;
grant execute on function public.place_school_order(uuid,uuid,uuid,jsonb,jsonb,text,text,text) to authenticated;

create or replace function public.release_school_order_inventory()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_alloc jsonb; v_qty integer; v_variant uuid;
begin
  if old.status not in ('cancelled','refunded') and new.status in ('cancelled','refunded') then
    for v_alloc in select jsonb_array_elements(oi.inventory_allocations) from public.order_items oi where oi.order_id=new.id loop
      v_variant:=nullif(v_alloc->>'variant_id','')::uuid; v_qty:=greatest(1,(v_alloc->>'quantity')::integer);
      update public.branch_inventory set quantity_on_hand=quantity_on_hand+v_qty where branch_id=new.branch_id and variant_id=v_variant;
      insert into public.inventory_transactions(branch_id,variant_id,movement_type,quantity,reference_type,reference_id,note,created_by)
      values(new.branch_id,v_variant,'release',v_qty,'order',new.id,'Released reservation for school order '||new.order_number,(select auth.uid()));
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_release_inventory_on_cancel on public.orders;
create trigger orders_release_inventory_on_cancel after update of status on public.orders
for each row execute function public.release_school_order_inventory();

create index if not exists idx_orders_customer_user_created on public.orders(customer_user_id,created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_branch_inventory_branch_variant on public.branch_inventory(branch_id,variant_id);

insert into public.branch_payment_settings(branch_id)
select b.id from public.branches b
where not exists(select 1 from public.branch_payment_settings x where x.branch_id=b.id);
