create or replace function public.calculate_school_shipping(p_state text,p_postal_code text,p_subtotal numeric)
returns jsonb language sql stable security definer set search_path='' as $$
  with matched as (
    select z.id,z.name,case when nullif(trim(coalesce(p_postal_code,'')),'') = any(coalesce(z.postal_codes,array[]::text[])) then 0 when nullif(trim(coalesce(p_state,'')),'') = any(coalesce(z.states,array[]::text[])) then 1 when z.is_default then 2 else 3 end priority
    from public.shipping_zones z where z.status='active' and (nullif(trim(coalesce(p_postal_code,'')),'') = any(coalesce(z.postal_codes,array[]::text[])) or nullif(trim(coalesce(p_state,'')),'') = any(coalesce(z.states,array[]::text[])) or z.is_default)
    order by priority,z.created_at limit 1
  ), method as (
    select m.name,m.method_type,m.rate,m.free_shipping_minimum from public.shipping_methods m join matched z on z.id=m.zone_id
    where m.enabled and (m.method_type<>'free_shipping' or m.free_shipping_minimum is null or coalesce(p_subtotal,0)>=m.free_shipping_minimum)
    order by m.sort_order,m.created_at limit 1
  )
  select coalesce((select jsonb_build_object('zone',z.name,'method',m.name,'rate',case when m.method_type in ('free_shipping','local_pickup') then 0 else coalesce(m.rate,0) end) from matched z cross join method m),jsonb_build_object('zone',null,'method','No shipping method','rate',0));
$$;
create or replace function public.place_school_order(
  p_branch_id uuid,p_student_id uuid,p_items jsonb,p_shipping_address jsonb,p_payment_method text,
  p_payment_reference text default null,p_notes text default null,p_coupon_code text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare base jsonb; v_order_id uuid; v_user_id uuid; preview jsonb; discount numeric; new_total numeric; shipping jsonb; shipping_rate numeric;
begin
  base:=public.place_school_order(p_branch_id,p_student_id,p_items,p_shipping_address,p_payment_method,p_payment_reference,p_notes);
  v_order_id:=(base->>'order_id')::uuid; v_user_id:=(select auth.uid());
  shipping:=public.calculate_school_shipping(p_shipping_address->>'state',p_shipping_address->>'postal_code',(base->>'subtotal')::numeric);
  shipping_rate:=coalesce((shipping->>'rate')::numeric,0);
  new_total:=round((base->>'subtotal')::numeric+shipping_rate,2);
  update public.orders set shipping_total=shipping_rate,grand_total=new_total where id=v_order_id and customer_user_id=v_user_id;
  update public.payments p set amount=new_total where p.order_id=v_order_id;
  base:=base||jsonb_build_object('shipping',shipping_rate,'shipping_method',shipping->>'method','grand_total',new_total);
  if p_coupon_code is null or nullif(trim(p_coupon_code),'') is null then return base; end if;
  preview:=public.preview_school_coupon(p_coupon_code,(base->>'subtotal')::numeric);
  if coalesce((preview->>'valid')::boolean,false) is not true then raise exception '%',coalesce(preview->>'message','Coupon is not valid.'); end if;
  discount:=coalesce((preview->>'discount')::numeric,0); new_total:=greatest(0,round(new_total-discount,2));
  insert into public.order_coupons(order_id,coupon_id,discount_amount) values(v_order_id,(preview->>'coupon_id')::uuid,discount);
  update public.orders set discount_total=discount,grand_total=new_total where id=v_order_id and customer_user_id=v_user_id;
  update public.payments p set amount=new_total,metadata=coalesce(p.metadata,'{}'::jsonb)||jsonb_build_object('coupon_code',preview->>'code','discount',discount) where p.order_id=v_order_id;
  return base||jsonb_build_object('discount',discount,'grand_total',new_total,'coupon_code',preview->>'code','payment_status','pending');
end $$;