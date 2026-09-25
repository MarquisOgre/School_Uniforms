insert into storage.buckets (id, name, public)
values ('package-images', 'package-images', true)
on conflict (id) do update set public = true;

drop policy if exists "package_images_public_read" on storage.objects;
create policy "package_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'package-images');

drop policy if exists "package_images_admin_insert" on storage.objects;
create policy "package_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'package-images'
  and (select app_private.current_user_role()::text) in ('admin', 'super_admin')
);

drop policy if exists "package_images_admin_update" on storage.objects;
create policy "package_images_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'package-images'
  and (select app_private.current_user_role()::text) in ('admin', 'super_admin')
)
with check (
  bucket_id = 'package-images'
  and (select app_private.current_user_role()::text) in ('admin', 'super_admin')
);

drop policy if exists "package_images_admin_delete" on storage.objects;
create policy "package_images_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'package-images'
  and (select app_private.current_user_role()::text) in ('admin', 'super_admin')
);
