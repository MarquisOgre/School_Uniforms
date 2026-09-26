create table if not exists public.razorpay_config (
  id integer primary key default 1 check (id = 1),
  mode text not null default 'test' check (mode in ('test','live')),
  key_id text,
  key_secret_vault_id uuid,
  webhook_secret_vault_id uuid,
  updated_at timestamptz not null default now()
);

alter table public.razorpay_config enable row level security;

revoke all on public.razorpay_config from anon, authenticated;
grant all on public.razorpay_config to service_role;

create or replace function public.admin_get_razorpay_settings(p_admin_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_role text;
  v_cfg public.razorpay_config;
begin
  select role into v_role from public.profiles where id = p_admin_user_id;
  if v_role not in ('admin','super_admin') then raise exception 'Not authorized'; end if;
  select * into v_cfg from public.razorpay_config where id = 1;
  return jsonb_build_object(
    'mode', coalesce(v_cfg.mode, 'test'),
    'key_id', coalesce(v_cfg.key_id, ''),
    'key_secret_configured', v_cfg.key_secret_vault_id is not null,
    'webhook_secret_configured', v_cfg.webhook_secret_vault_id is not null,
    'updated_at', v_cfg.updated_at
  );
end;
$$;

create or replace function public.admin_save_razorpay_settings(
  p_admin_user_id uuid,
  p_mode text,
  p_key_id text,
  p_key_secret text default null,
  p_webhook_secret text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_role text;
  v_cfg public.razorpay_config;
  v_key_secret_id uuid;
  v_webhook_secret_id uuid;
begin
  select role into v_role from public.profiles where id = p_admin_user_id;
  if v_role not in ('admin','super_admin') then raise exception 'Not authorized'; end if;
  if p_mode not in ('test','live') then raise exception 'Invalid Razorpay mode'; end if;
  if nullif(trim(coalesce(p_key_id,'')), '') is null then raise exception 'Razorpay Key ID is required'; end if;

  select * into v_cfg from public.razorpay_config where id = 1;
  v_key_secret_id := v_cfg.key_secret_vault_id;
  v_webhook_secret_id := v_cfg.webhook_secret_vault_id;

  if nullif(trim(coalesce(p_key_secret,'')), '') is not null then
    if v_key_secret_id is null then
      v_key_secret_id := vault.create_secret(trim(p_key_secret), 'school_uniforms_razorpay_key_secret', 'School Uniforms Razorpay API Key Secret');
    else
      perform vault.update_secret(v_key_secret_id, trim(p_key_secret), 'school_uniforms_razorpay_key_secret', 'School Uniforms Razorpay API Key Secret');
    end if;
  end if;

  if nullif(trim(coalesce(p_webhook_secret,'')), '') is not null then
    if v_webhook_secret_id is null then
      v_webhook_secret_id := vault.create_secret(trim(p_webhook_secret), 'school_uniforms_razorpay_webhook_secret', 'School Uniforms Razorpay Webhook Secret');
    else
      perform vault.update_secret(v_webhook_secret_id, trim(p_webhook_secret), 'school_uniforms_razorpay_webhook_secret', 'School Uniforms Razorpay Webhook Secret');
    end if;
  end if;

  insert into public.razorpay_config (id, mode, key_id, key_secret_vault_id, webhook_secret_vault_id, updated_at)
  values (1, p_mode, trim(p_key_id), v_key_secret_id, v_webhook_secret_id, now())
  on conflict (id) do update set
    mode = excluded.mode,
    key_id = excluded.key_id,
    key_secret_vault_id = excluded.key_secret_vault_id,
    webhook_secret_vault_id = excluded.webhook_secret_vault_id,
    updated_at = now();

  return public.admin_get_razorpay_settings(p_admin_user_id);
end;
$$;

create or replace function public.service_get_razorpay_config()
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_cfg public.razorpay_config;
  v_key_secret text;
  v_webhook_secret text;
begin
  select * into v_cfg from public.razorpay_config where id = 1;
  if v_cfg.id is null then return jsonb_build_object('configured', false); end if;

  if v_cfg.key_secret_vault_id is not null then
    select decrypted_secret into v_key_secret from vault.decrypted_secrets where id = v_cfg.key_secret_vault_id;
  end if;
  if v_cfg.webhook_secret_vault_id is not null then
    select decrypted_secret into v_webhook_secret from vault.decrypted_secrets where id = v_cfg.webhook_secret_vault_id;
  end if;

  return jsonb_build_object(
    'configured', v_cfg.key_id is not null and v_key_secret is not null,
    'mode', v_cfg.mode,
    'key_id', coalesce(v_cfg.key_id, ''),
    'key_secret', coalesce(v_key_secret, ''),
    'webhook_secret', coalesce(v_webhook_secret, '')
  );
end;
$$;

revoke all on function public.admin_get_razorpay_settings(uuid) from public, anon, authenticated;
revoke all on function public.admin_save_razorpay_settings(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.service_get_razorpay_config() from public, anon, authenticated;

grant execute on function public.admin_get_razorpay_settings(uuid) to service_role;
grant execute on function public.admin_save_razorpay_settings(uuid,text,text,text,text) to service_role;
grant execute on function public.service_get_razorpay_config() to service_role;