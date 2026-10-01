-- Remove the legacy coupon system.
-- Promotions are now the single discount/promotion mechanism.
--
-- The live database currently has zero order_coupons rows, so no historical
-- coupon discount records are being removed from existing orders.

drop function if exists public.preview_school_coupon(text, numeric);

drop function if exists public.place_school_order(
  uuid, uuid, jsonb, jsonb, text, text, text, text
);

alter function public.place_school_order(
  uuid, uuid, jsonb, jsonb, text, text, text
) rename to place_school_order_base;

revoke all on function public.place_school_order_base(
  uuid, uuid, jsonb, jsonb, text, text, text
) from public, anon, authenticated;

create or replace function public.place_school_order(
  p_branch_id uuid,
  p_student_id uuid,
  p_items jsonb,
  p_shipping_address jsonb,
  p_payment_method text,
  p_payment_reference text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  base jsonb;
  v_order_id uuid;
  v_user_id uuid;
  promotion_preview jsonb;
  promotion_discount numeric := 0;
  promotion_shipping_discount numeric := 0;
  new_total numeric;
  shipping jsonb;
  shipping_rate numeric := 0;
begin
  base := public.place_school_order_base(
    p_branch_id,
    p_student_id,
    p_items,
    p_shipping_address,
    p_payment_method,
    p_payment_reference,
    p_notes
  );

  v_order_id := (base->>'order_id')::uuid;
  v_user_id := (select auth.uid());

  shipping := public.calculate_school_shipping(
    p_shipping_address->>'state',
    p_shipping_address->>'postal_code',
    (base->>'subtotal')::numeric
  );
  shipping_rate := coalesce((shipping->>'rate')::numeric, 0);
  new_total := round((base->>'subtotal')::numeric + shipping_rate, 2);

  update public.orders
  set shipping_total = shipping_rate,
      grand_total = new_total
  where id = v_order_id
    and customer_user_id = v_user_id;

  update public.payments
  set amount = new_total
  where order_id = v_order_id;

  base := base || jsonb_build_object(
    'shipping', shipping_rate,
    'shipping_method', shipping->>'method',
    'grand_total', new_total
  );

  promotion_preview := public.preview_school_promotion(
    p_branch_id,
    (base->>'subtotal')::numeric,
    shipping_rate
  );

  if coalesce((promotion_preview->>'valid')::boolean, false) is true then
    promotion_discount := coalesce((promotion_preview->>'discount')::numeric, 0);
    promotion_shipping_discount := coalesce(
      (promotion_preview->>'shipping_discount')::numeric,
      0
    );

    new_total := greatest(
      0,
      round(
        (base->>'subtotal')::numeric
        + shipping_rate
        - promotion_discount
        - promotion_shipping_discount,
        2
      )
    );

    update public.promotions
    set usage_count = usage_count + 1,
        updated_at = now()
    where id = (promotion_preview->>'promotion_id')::uuid
      and enabled = true
      and (usage_limit is null or usage_count < usage_limit);

    if not found then
      raise exception 'The promotion is no longer available. Please review your cart and try again.';
    end if;

    insert into public.order_promotions(
      order_id,
      promotion_id,
      promotion_name,
      promotion_type,
      promotion_value,
      discount_amount,
      shipping_discount
    )
    values(
      v_order_id,
      (promotion_preview->>'promotion_id')::uuid,
      promotion_preview->>'name',
      promotion_preview->>'promotion_type',
      coalesce((promotion_preview->>'value')::numeric, 0),
      promotion_discount,
      promotion_shipping_discount
    );

    update public.orders
    set discount_total = round(
          promotion_discount + promotion_shipping_discount,
          2
        ),
        shipping_total = greatest(
          0,
          round(shipping_rate - promotion_shipping_discount, 2)
        ),
        grand_total = new_total
    where id = v_order_id
      and customer_user_id = v_user_id;

    update public.payments
    set amount = new_total,
        metadata = coalesce(metadata, '{}'::jsonb) ||
          jsonb_build_object(
            'promotion_id',
            promotion_preview->>'promotion_id',
            'promotion_name',
            promotion_preview->>'name',
            'promotion_discount',
            promotion_discount,
            'promotion_shipping_discount',
            promotion_shipping_discount
          )
    where order_id = v_order_id;

    base := base || jsonb_build_object(
      'discount',
      round(promotion_discount + promotion_shipping_discount, 2),
      'promotion_id',
      promotion_preview->>'promotion_id',
      'promotion_name',
      promotion_preview->>'name',
      'promotion_discount',
      promotion_discount,
      'promotion_shipping_discount',
      promotion_shipping_discount,
      'shipping',
      greatest(0, round(shipping_rate - promotion_shipping_discount, 2)),
      'grand_total',
      new_total,
      'payment_status',
      'pending'
    );
  end if;

  return base;
end;
$function$;

revoke all on function public.place_school_order(
  uuid, uuid, jsonb, jsonb, text, text, text
) from public, anon;

grant execute on function public.place_school_order(
  uuid, uuid, jsonb, jsonb, text, text, text
) to authenticated;

drop table if exists public.order_coupons cascade;
drop table if exists public.branch_coupons cascade;
drop table if exists public.coupons cascade;
