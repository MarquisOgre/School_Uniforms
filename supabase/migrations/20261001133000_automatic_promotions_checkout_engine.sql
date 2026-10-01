-- Native automatic promotions: storefront display, checkout application and order snapshots.
create table if not exists public.order_promotions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  promotion_id uuid not null references public.promotions(id) on delete restrict,
  promotion_name text not null,
  promotion_type text not null,
  promotion_value numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  shipping_discount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(order_id,promotion_id)
);
create index if not exists idx_order_promotions_order on public.order_promotions(order_id);
create index if not exists idx_order_promotions_promotion on public.order_promotions(promotion_id);
alter table public.order_promotions enable row level security;
grant select on table public.order_promotions to authenticated;
drop policy if exists order_promotions_customer_read on public.order_promotions;
create policy order_promotions_customer_read on public.order_promotions for select to authenticated using (
  exists (select 1 from public.orders o where o.id=order_promotions.order_id and
    (o.customer_user_id=(select auth.uid()) or (select app_private.current_user_role())=any(array['admin'::account_role,'school_manager'::account_role,'branch_manager'::account_role])))
);
create or replace function public.preview_school_promotion(p_branch_id uuid,p_subtotal numeric,p_shipping numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r record; v_subtotal numeric:=greatest(coalesce(p_subtotal,0),0); v_shipping numeric:=greatest(coalesce(p_shipping,0),0); v_discount numeric; v_shipping_discount numeric;
begin
  if p_branch_id is null then return jsonb_build_object('valid',false,'message','Branch is required.'); end if;
  select p.id,p.name,p.description,p.promotion_type,p.value,p.min_order_value,p.usage_limit,p.usage_count,p.branch_id,p.starts_at,p.ends_at into r
  from public.promotions p where p.enabled=true and (p.branch_id is null or p.branch_id=p_branch_id)
    and (p.starts_at is null or p.starts_at<=now()) and (p.ends_at is null or p.ends_at>=now())
    and (p.usage_limit is null or p.usage_count<p.usage_limit) and v_subtotal>=coalesce(p.min_order_value,0)
  order by case when p.promotion_type='free_shipping' then v_shipping
    when p.promotion_type='percentage' then least(v_subtotal,round(v_subtotal*greatest(p.value,0)/100,2))
    else least(v_subtotal,greatest(p.value,0)) end desc,
    case when p.branch_id=p_branch_id then 0 else 1 end,p.created_at desc limit 1;
  if r.id is null then return jsonb_build_object('valid',false,'message','No automatic promotion is currently available.'); end if;
  v_discount:=0; v_shipping_discount:=0;
  if r.promotion_type='free_shipping' then v_shipping_discount:=v_shipping;
  elsif r.promotion_type='percentage' then v_discount:=least(v_subtotal,round(v_subtotal*greatest(r.value,0)/100,2));
  else v_discount:=least(v_subtotal,greatest(r.value,0)); end if;
  return jsonb_build_object('valid',true,'promotion_id',r.id,'name',r.name,'description',r.description,'promotion_type',r.promotion_type,'value',r.value,'discount',round(v_discount,2),'shipping_discount',round(v_shipping_discount,2),'message',case when r.promotion_type='free_shipping' then r.name||' applied: free shipping.' else r.name||' applied.' end);
end; $$;
revoke all on function public.preview_school_promotion(uuid,numeric,numeric) from public;
revoke all on function public.preview_school_promotion(uuid,numeric,numeric) from anon;
grant execute on function public.preview_school_promotion(uuid,numeric,numeric) to authenticated;
create or replace function public.place_school_order(
  p_branch_id uuid,p_student_id uuid,p_items jsonb,p_shipping_address jsonb,p_payment_method text,
  p_payment_reference text default null,p_notes text default null,p_coupon_code text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  base jsonb; v_order_id uuid; v_user_id uuid; preview jsonb; promotion_preview jsonb;
  discount numeric:=0; promotion_discount numeric:=0; promotion_shipping_discount numeric:=0;
  new_total numeric; shipping jsonb; shipping_rate numeric:=0;
begin
  base:=public.place_school_order(p_branch_id,p_student_id,p_items,p_shipping_address,p_payment_method,p_payment_reference,p_notes);
  v_order_id:=(base->>'order_id')::uuid; v_user_id:=(select auth.uid());
  shipping:=public.calculate_school_shipping(p_shipping_address->>'state',p_shipping_address->>'postal_code',(base->>'subtotal')::numeric);
  shipping_rate:=coalesce((shipping->>'rate')::numeric,0); new_total:=round((base->>'subtotal')::numeric+shipping_rate,2);
  update public.orders set shipping_total=shipping_rate,grand_total=new_total where id=v_order_id and customer_user_id=v_user_id;
  update public.payments set amount=new_total where order_id=v_order_id;
  base:=base||jsonb_build_object('shipping',shipping_rate,'shipping_method',shipping->>'method','grand_total',new_total);
  if p_coupon_code is not null and nullif(trim(p_coupon_code),'') is not null then
    preview:=public.preview_school_coupon(p_coupon_code,(base->>'subtotal')::numeric);
    if coalesce((preview->>'valid')::boolean,false) is not true then raise exception '%',coalesce(preview->>'message','Coupon is not valid.'); end if;
    discount:=coalesce((preview->>'discount')::numeric,0); new_total:=greatest(0,round(new_total-discount,2));
    insert into public.order_coupons(order_id,coupon_id,discount_amount) values(v_order_id,(preview->>'coupon_id')::uuid,discount);
    update public.orders set discount_total=discount,grand_total=new_total where id=v_order_id and customer_user_id=v_user_id;
    update public.payments set amount=new_total,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('coupon_code',preview->>'code','discount',discount) where order_id=v_order_id;
    base:=base||jsonb_build_object('discount',discount,'grand_total',new_total,'coupon_code',preview->>'code','payment_status','pending');
  else
    promotion_preview:=public.preview_school_promotion(p_branch_id,(base->>'subtotal')::numeric,shipping_rate);
    if coalesce((promotion_preview->>'valid')::boolean,false) is true then
      promotion_discount:=coalesce((promotion_preview->>'discount')::numeric,0); promotion_shipping_discount:=coalesce((promotion_preview->>'shipping_discount')::numeric,0);
      new_total:=greatest(0,round((base->>'subtotal')::numeric+shipping_rate-promotion_discount-promotion_shipping_discount,2));
      update public.promotions set usage_count=usage_count+1,updated_at=now() where id=(promotion_preview->>'promotion_id')::uuid and enabled=true and (usage_limit is null or usage_count<usage_limit);
      if not found then raise exception 'The promotion is no longer available. Please review your cart and try again.'; end if;
      insert into public.order_promotions(order_id,promotion_id,promotion_name,promotion_type,promotion_value,discount_amount,shipping_discount)
      values(v_order_id,(promotion_preview->>'promotion_id')::uuid,promotion_preview->>'name',promotion_preview->>'promotion_type',coalesce((promotion_preview->>'value')::numeric,0),promotion_discount,promotion_shipping_discount);
      update public.orders set discount_total=round(promotion_discount+promotion_shipping_discount,2),shipping_total=greatest(0,round(shipping_rate-promotion_shipping_discount,2)),grand_total=new_total where id=v_order_id and customer_user_id=v_user_id;
      update public.payments set amount=new_total,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('promotion_id',promotion_preview->>'promotion_id','promotion_name',promotion_preview->>'name','promotion_discount',promotion_discount,'promotion_shipping_discount',promotion_shipping_discount) where order_id=v_order_id;
      base:=base||jsonb_build_object('discount',round(promotion_discount+promotion_shipping_discount,2),'promotion_id',promotion_preview->>'promotion_id','promotion_name',promotion_preview->>'name','promotion_discount',promotion_discount,'promotion_shipping_discount',promotion_shipping_discount,'shipping',greatest(0,round(shipping_rate-promotion_shipping_discount,2)),'grand_total',new_total,'payment_status','pending');
    end if;
  end if;
  return base;
end; $$;
revoke all on function public.place_school_order(uuid,uuid,jsonb,jsonb,text,text,text,text) from public;
revoke all on function public.place_school_order(uuid,uuid,jsonb,jsonb,text,text,text,text) from anon;
grant execute on function public.place_school_order(uuid,uuid,jsonb,jsonb,text,text,text,text) to authenticated;