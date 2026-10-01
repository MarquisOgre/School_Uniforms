-- Coupon validation and checkout enforcement.
create or replace function public.preview_school_coupon(p_code text,p_subtotal numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.coupons%rowtype; usage_count integer; eligible numeric; discount numeric;
begin
  if nullif(trim(p_code),'') is null then return jsonb_build_object('valid',false,'message','Enter a coupon code.'); end if;
  select * into c from public.coupons where upper(code)=upper(trim(p_code)) and status='active' limit 1;
  if c.id is null then return jsonb_build_object('valid',false,'message','Coupon code is not valid.'); end if;
  if c.starts_at is not null and c.starts_at>now() then return jsonb_build_object('valid',false,'message','This coupon is not active yet.'); end if;
  if c.expires_at is not null and c.expires_at<now() then return jsonb_build_object('valid',false,'message','This coupon has expired.'); end if;
  if c.usage_limit is not null then select count(*) into usage_count from public.order_coupons where coupon_id=c.id; if usage_count>=c.usage_limit then return jsonb_build_object('valid',false,'message','This coupon has reached its usage limit.'); end if; end if;
  if c.per_customer_limit is not null and (select count(*) from public.order_coupons oc join public.orders o on o.id=oc.order_id where oc.coupon_id=c.id and o.customer_user_id=(select auth.uid()))>=c.per_customer_limit then return jsonb_build_object('valid',false,'message','You have reached this coupon limit.'); end if;
  if c.first_order_only and exists(select 1 from public.orders where customer_user_id=(select auth.uid()) and status<>'cancelled') then return jsonb_build_object('valid',false,'message','This coupon is only valid on your first order.'); end if;
  if coalesce(p_subtotal,0)<coalesce(c.minimum_order_value,0) then return jsonb_build_object('valid',false,'message','Minimum order value is ₹'||to_char(c.minimum_order_value,'FM999999990.00')); end if;
  eligible:=greatest(coalesce(p_subtotal,0),0);
  if c.discount_type='percentage' then discount:=round(eligible*greatest(c.discount_value,0)/100,2); else discount:=round(greatest(c.discount_value,0),2); end if;
  if c.maximum_discount is not null then discount:=least(discount,c.maximum_discount); end if;
  discount:=least(greatest(discount,0),eligible);
  return jsonb_build_object('valid',true,'coupon_id',c.id,'code',c.code,'discount',discount,'message','Coupon applied.');
end $$;
create or replace function public.place_school_order(
  p_branch_id uuid,p_student_id uuid,p_items jsonb,p_shipping_address jsonb,p_payment_method text,
  p_payment_reference text default null,p_notes text default null,p_coupon_code text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare base jsonb; v_order_id uuid; v_user_id uuid; preview jsonb; discount numeric; new_total numeric; old_total numeric;
begin
  base:=public.place_school_order(p_branch_id,p_student_id,p_items,p_shipping_address,p_payment_method,p_payment_reference,p_notes);
  v_order_id:=(base->>'order_id')::uuid; v_user_id:=(select auth.uid());
  if p_coupon_code is null or nullif(trim(p_coupon_code),'') is null then return base; end if;
  preview:=public.preview_school_coupon(p_coupon_code,(base->>'subtotal')::numeric);
  if coalesce((preview->>'valid')::boolean,false) is not true then raise exception '%',coalesce(preview->>'message','Coupon is not valid.'); end if;
  discount:=coalesce((preview->>'discount')::numeric,0); old_total:=(base->>'grand_total')::numeric; new_total:=greatest(0,round(old_total-discount,2));
  insert into public.order_coupons(order_id,coupon_id,discount_amount) values(v_order_id,(preview->>'coupon_id')::uuid,discount);
  update public.orders set discount_total=discount,grand_total=new_total where id=v_order_id and customer_user_id=v_user_id;
  update public.payments p set amount=new_total,metadata=coalesce(p.metadata,'{}'::jsonb)||jsonb_build_object('coupon_code',preview->>'code','discount',discount) where p.order_id=v_order_id;
  return base||jsonb_build_object('discount',discount,'grand_total',new_total,'coupon_code',preview->>'code','payment_status','pending');
end $$;