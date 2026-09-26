DO $$
DECLARE f text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO f
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='place_school_order'
  LIMIT 1;

  f := replace(
    f,
    'p_payment_method not in (''upi'',''pay_at_school'')',
    'p_payment_method not in (''upi'',''pay_at_school'',''razorpay'')'
  );

  f := replace(
    f,
    '  elsif not exists(select 1 from public.branch_payment_settings bps where bps.branch_id=p_branch_id and bps.pay_at_school_enabled) then raise exception ''Pay at School is not enabled for this branch.''; end if;',
    '  elsif p_payment_method=''pay_at_school'' then
    if not exists(select 1 from public.branch_payment_settings bps where bps.branch_id=p_branch_id and bps.pay_at_school_enabled) then raise exception ''Pay at School is not enabled for this branch.''; end if;
  elsif p_payment_method=''razorpay'' then
    if not exists(select 1 from public.branch_payment_settings bps where bps.branch_id=p_branch_id and bps.razorpay_enabled) then raise exception ''Razorpay payment is not enabled for this branch.''; end if;
  end if;'
  );

  f := replace(
    f,
    'case when p_payment_method=''upi'' then ''manual_upi'' else ''school'' end',
    'case when p_payment_method=''upi'' then ''manual_upi'' when p_payment_method=''razorpay'' then ''razorpay'' else ''school'' end'
  );

  EXECUTE f;
END $$;