-- Allow signed-in customers to read their own profile.
drop policy if exists "profiles_customer_read_own" on public.profiles;
create policy "profiles_customer_read_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

-- Allow customers to read students linked to their account,
-- with a login_id fallback for legacy student accounts.
drop policy if exists "students_customer_read_linked" on public.students;
create policy "students_customer_read_linked"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_student_links psl
    where psl.parent_user_id = (select auth.uid())
      and psl.student_id = students.id
  )
  or student_code = (
    select p.login_id
    from public.profiles p
    where p.id = (select auth.uid())
  )
);

grant select on public.profiles to authenticated;
grant select on public.students to authenticated;