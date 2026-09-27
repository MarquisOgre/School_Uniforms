-- Restore Resend as the active transactional email provider after the prior Zoho SMTP experiment.
alter table public.email_config alter column provider set default 'resend';

create or replace function public.admin_get_email_config(p_admin_user_id uuid)
returns jsonb language plpgsql security definer
set search_path to public, vault
as $$
declare v_role text; v_cfg public.email_config;
begin
  select role into v_role from public.profiles where id=p_admin_user_id;
  if v_role not in ('admin','super_admin') then raise exception 'Not authorized'; end if;
  select * into v_cfg from public.email_config where id=1;
  return jsonb_build_object(
    'provider',coalesce(v_cfg.provider,'resend'),
    'from_name',coalesce(v_cfg.from_name,'School Uniforms'),
    'from_email',coalesce(v_cfg.from_email,''),
    'reply_to',coalesce(v_cfg.reply_to,''),
    'api_key_configured',v_cfg.api_key_vault_id is not null,
    'enabled',coalesce(v_cfg.enabled,true),
    'updated_at',v_cfg.updated_at
  );
end; $$;

create or replace function public.admin_save_email_config(
  p_admin_user_id uuid,
  p_provider text,
  p_from_name text,
  p_from_email text,
  p_reply_to text default null,
  p_api_key text default null,
  p_enabled boolean default true
)
returns jsonb language plpgsql security definer
set search_path to public, vault
as $$
declare v_role text; v_cfg public.email_config; v_secret_id uuid;
begin
  select role into v_role from public.profiles where id=p_admin_user_id;
  if v_role not in ('admin','super_admin') then raise exception 'Not authorized'; end if;
  if lower(trim(coalesce(p_provider,''))) <> 'resend' then raise exception 'Only Resend is currently supported'; end if;
  if nullif(trim(coalesce(p_from_email,'')),'') is null then raise exception 'From Email is required'; end if;

  select * into v_cfg from public.email_config where id=1;
  v_secret_id:=v_cfg.api_key_vault_id;

  if nullif(trim(coalesce(p_api_key,'')),'') is not null then
    if v_secret_id is null then
      v_secret_id:=vault.create_secret(trim(p_api_key),'school_uniforms_resend_api_key','School Uniforms Resend API Key');
    else
      perform vault.update_secret(v_secret_id,trim(p_api_key),'school_uniforms_resend_api_key','School Uniforms Resend API Key');
    end if;
  end if;

  insert into public.email_config(id,provider,from_name,from_email,reply_to,api_key_vault_id,enabled,updated_at)
  values(1,'resend',trim(coalesce(p_from_name,'School Uniforms')),trim(p_from_email),nullif(trim(coalesce(p_reply_to,'')),''),v_secret_id,coalesce(p_enabled,true),now())
  on conflict(id) do update set
    provider=excluded.provider,
    from_name=excluded.from_name,
    from_email=excluded.from_email,
    reply_to=excluded.reply_to,
    api_key_vault_id=coalesce(excluded.api_key_vault_id,public.email_config.api_key_vault_id),
    enabled=excluded.enabled,
    updated_at=now();

  return public.admin_get_email_config(p_admin_user_id);
end; $$;

create or replace function public.service_get_email_config()
returns jsonb language plpgsql security definer
set search_path to public, vault
as $$
declare v_cfg public.email_config; v_api_key text;
begin
  select * into v_cfg from public.email_config where id=1;
  if v_cfg.api_key_vault_id is not null then
    select decrypted_secret into v_api_key from vault.decrypted_secrets where id=v_cfg.api_key_vault_id;
  end if;
  return jsonb_build_object(
    'provider',coalesce(v_cfg.provider,'resend'),
    'from_name',coalesce(v_cfg.from_name,'School Uniforms'),
    'from_email',coalesce(v_cfg.from_email,''),
    'reply_to',coalesce(v_cfg.reply_to,''),
    'api_key',coalesce(v_api_key,''),
    'enabled',coalesce(v_cfg.enabled,true)
  );
end; $$;

revoke all on function public.service_get_email_config() from public, anon, authenticated;
grant execute on function public.service_get_email_config() to service_role;
