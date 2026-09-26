create table if not exists public.site_branding (
  id integer primary key default 1 check (id = 1),
  logo_url text,
  favicon_url text,
  updated_at timestamptz not null default now()
);
insert into public.site_branding(id) values(1) on conflict(id) do nothing;
alter table public.site_branding enable row level security;
drop policy if exists site_branding_public_read on public.site_branding;
drop policy if exists site_branding_admin_manage on public.site_branding;
create policy site_branding_public_read on public.site_branding for select using (true);
create policy site_branding_admin_manage on public.site_branding for all using ((select app_private.current_user_role())::text in ('admin','super_admin')) with check ((select app_private.current_user_role())::text in ('admin','super_admin'));
grant select on table public.site_branding to anon, authenticated;
grant insert, update, delete on table public.site_branding to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('site-assets','site-assets',true,5242880,array['image/png','image/jpeg','image/webp','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists site_assets_public_read on storage.objects;
drop policy if exists site_assets_admin_insert on storage.objects;
drop policy if exists site_assets_admin_update on storage.objects;
drop policy if exists site_assets_admin_delete on storage.objects;
create policy site_assets_public_read on storage.objects for select using (bucket_id='site-assets');
create policy site_assets_admin_insert on storage.objects for insert to authenticated with check (bucket_id='site-assets' and (select app_private.current_user_role())::text in ('admin','super_admin'));
create policy site_assets_admin_update on storage.objects for update to authenticated using (bucket_id='site-assets' and (select app_private.current_user_role())::text in ('admin','super_admin')) with check (bucket_id='site-assets' and (select app_private.current_user_role())::text in ('admin','super_admin'));
create policy site_assets_admin_delete on storage.objects for delete to authenticated using (bucket_id='site-assets' and (select app_private.current_user_role())::text in ('admin','super_admin'));