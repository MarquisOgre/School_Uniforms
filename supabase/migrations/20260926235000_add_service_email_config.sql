create or replace function public.service_get_email_config()
returns jsonb
language plpgsql
security definer
set search_path to public, vault
as $$
declare
  v_cfg public.email_config;
  v_api_key text;
begin
  select * into v_cfg from public.email_config where id = 1;
  if v_cfg.api_key_vault_id is not null then
    select decrypted_secret into v_api_key
    from vault.decrypted_secrets
    where id = v_cfg.api_key_vault_id;
  end if;
  return jsonb_build_object(
    'provider', coalesce(v_cfg.provider, 'resend'),
    'from_name', coalesce(v_cfg.from_name, 'School Uniforms'),
    'from_email', coalesce(v_cfg.from_email, ''),
    'reply_to', coalesce(v_cfg.reply_to, ''),
    'api_key', coalesce(v_api_key, ''),
    'enabled', coalesce(v_cfg.enabled, true)
  );
end;
$$;

revoke all on function public.service_get_email_config() from public, anon, authenticated;
grant execute on function public.service_get_email_config() to service_role;
