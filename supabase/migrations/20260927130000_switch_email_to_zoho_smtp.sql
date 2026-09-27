alter table public.email_config
  add column if not exists smtp_host text not null default 'smtp.zoho.com',
  add column if not exists smtp_port integer not null default 465,
  add column if not exists smtp_user text not null default '',
  add column if not exists smtp_secure boolean not null default true,
  add column if not exists smtp_password_vault_id uuid;

alter table public.email_config
  alter column provider set default 'zoho_smtp';

drop function if exists public.admin_save_email_config(uuid,text,text,text,text,text,boolean);

create or replace function public.admin_get_email_config(p_admin_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to public, vault
as $$
declare
  v_role text;
  v_cfg public.email_config;
begin
  select role into v_role from public.profiles where id = p_admin_user_id;
  if v_role not in ('admin','super_admin') then
    raise exception 'Not authorized';
  end if;

  select * into v_cfg from public.email_config where id = 1;

  return jsonb_build_object(
    'provider', coalesce(v_cfg.provider,'zoho_smtp'),
    'from_name', coalesce(v_cfg.from_name,'School Uniforms'),
    'from_email', coalesce(v_cfg.from_email,''),
    'reply_to', coalesce(v_cfg.reply_to,''),
    'smtp_host', coalesce(v_cfg.smtp_host,'smtp.zoho.com'),
    'smtp_port', coalesce(v_cfg.smtp_port,465),
    'smtp_user', coalesce(v_cfg.smtp_user,''),
    'smtp_secure', coalesce(v_cfg.smtp_secure,true),
    'smtp_password_configured', v_cfg.smtp_password_vault_id is not null,
    'enabled', coalesce(v_cfg.enabled,true),
    'updated_at', v_cfg.updated_at
  );
end;
$$;

create or replace function public.admin_save_email_config(
  p_admin_user_id uuid,
  p_provider text,
  p_from_name text,
  p_from_email text,
  p_reply_to text default null,
  p_smtp_host text default 'smtp.zoho.com',
  p_smtp_port integer default 465,
  p_smtp_user text default '',
  p_smtp_password text default null,
  p_smtp_secure boolean default true,
  p_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to public, vault
as $$
declare
  v_role text;
  v_cfg public.email_config;
  v_secret_id uuid;
begin
  select role into v_role from public.profiles where id=p_admin_user_id;
  if v_role not in ('admin','super_admin') then
    raise exception 'Not authorized';
  end if;

  if lower(trim(coalesce(p_provider,''))) <> 'zoho_smtp' then
    raise exception 'Only Zoho SMTP is currently supported';
  end if;

  if nullif(trim(coalesce(p_from_email,'')),'') is null then
    raise exception 'From Email is required';
  end if;

  if nullif(trim(coalesce(p_smtp_host,'')),'') is null then
    raise exception 'SMTP Host is required';
  end if;

  if p_smtp_port not in (465,587) then
    raise exception 'SMTP Port must be 465 or 587';
  end if;

  if nullif(trim(coalesce(p_smtp_user,'')),'') is null then
    raise exception 'SMTP Username is required';
  end if;

  select * into v_cfg from public.email_config where id=1;
  v_secret_id := v_cfg.smtp_password_vault_id;

  if nullif(trim(coalesce(p_smtp_password,'')),'') is not null then
    if v_secret_id is null then
      v_secret_id := vault.create_secret(
        trim(p_smtp_password),
        'school_uniforms_zoho_smtp_password',
        'School Uniforms Zoho SMTP Password'
      );
    else
      perform vault.update_secret(
        v_secret_id,
        trim(p_smtp_password),
        'school_uniforms_zoho_smtp_password',
        'School Uniforms Zoho SMTP Password'
      );
    end if;
  end if;

  insert into public.email_config(
    id,provider,from_name,from_email,reply_to,
    smtp_host,smtp_port,smtp_user,smtp_secure,smtp_password_vault_id,
    enabled,updated_at
  )
  values(
    1,'zoho_smtp',
    trim(coalesce(p_from_name,'School Uniforms')),
    trim(p_from_email),
    nullif(trim(coalesce(p_reply_to,'')),''),
    trim(p_smtp_host),
    p_smtp_port,
    trim(p_smtp_user),
    coalesce(p_smtp_secure,p_smtp_port=465),
    v_secret_id,
    coalesce(p_enabled,true),
    now()
  )
  on conflict(id) do update set
    provider=excluded.provider,
    from_name=excluded.from_name,
    from_email=excluded.from_email,
    reply_to=excluded.reply_to,
    smtp_host=excluded.smtp_host,
    smtp_port=excluded.smtp_port,
    smtp_user=excluded.smtp_user,
    smtp_secure=excluded.smtp_secure,
    smtp_password_vault_id=coalesce(excluded.smtp_password_vault_id,public.email_config.smtp_password_vault_id),
    enabled=excluded.enabled,
    updated_at=now();

  return public.admin_get_email_config(p_admin_user_id);
end;
$$;

create or replace function public.service_get_email_config()
returns jsonb
language plpgsql
security definer
set search_path to public, vault
as $$
declare
  v_cfg public.email_config;
  v_password text;
begin
  select * into v_cfg from public.email_config where id = 1;

  if v_cfg.smtp_password_vault_id is not null then
    select decrypted_secret into v_password
    from vault.decrypted_secrets
    where id = v_cfg.smtp_password_vault_id;
  end if;

  return jsonb_build_object(
    'provider', coalesce(v_cfg.provider, 'zoho_smtp'),
    'from_name', coalesce(v_cfg.from_name, 'School Uniforms'),
    'from_email', coalesce(v_cfg.from_email, ''),
    'reply_to', coalesce(v_cfg.reply_to, ''),
    'smtp_host', coalesce(v_cfg.smtp_host, 'smtp.zoho.com'),
    'smtp_port', coalesce(v_cfg.smtp_port, 465),
    'smtp_user', coalesce(v_cfg.smtp_user, ''),
    'smtp_secure', coalesce(v_cfg.smtp_secure, true),
    'smtp_password', coalesce(v_password, ''),
    'enabled', coalesce(v_cfg.enabled, true)
  );
end;
$$;

revoke all on function public.service_get_email_config() from public, anon, authenticated;
grant execute on function public.service_get_email_config() to service_role;
