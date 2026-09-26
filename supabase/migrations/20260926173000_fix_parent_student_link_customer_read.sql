-- Allow authenticated parents to read only their own student links.
-- The parent portal and checkout use this relationship to resolve the student's UUID.

drop policy if exists "parent_links_customer_read" on public.parent_student_links;

create policy "parent_links_customer_read"
on public.parent_student_links
for select
to authenticated
using (
  parent_user_id = (select auth.uid())
);

grant select on table public.parent_student_links to authenticated;
