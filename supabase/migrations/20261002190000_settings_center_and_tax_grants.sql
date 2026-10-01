-- Settings center and tax Data API grants
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;

drop policy if exists "system_settings_admin_read" on public.system_settings;
create policy "system_settings_admin_read"
  on public.system_settings
  for select
  to authenticated
  using (
    (select app_private.current_user_role())::text = any(array['admin','super_admin'])
  );

drop policy if exists "system_settings_admin_manage" on public.system_settings;
create policy "system_settings_admin_manage"
  on public.system_settings
  for all
  to authenticated
  using (
    (select app_private.current_user_role())::text = any(array['admin','super_admin'])
  )
  with check (
    (select app_private.current_user_role())::text = any(array['admin','super_admin'])
  );

grant select, insert, update, delete on public.system_settings to authenticated;
grant select, insert, update, delete on public.system_settings to service_role;

-- These tables already have appropriate RLS policies, but their Data API grants
-- were revoked, which caused the Settings page to show "permission denied".
grant select, insert, update, delete on public.tax_classes to authenticated;
grant select, insert, update, delete on public.tax_rates to authenticated;
grant select, insert, update, delete on public.tax_rate_history to authenticated;
