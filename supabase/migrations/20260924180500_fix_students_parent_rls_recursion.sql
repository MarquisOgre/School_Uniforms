-- Fix recursive RLS evaluation between students and parent_student_links.
--
-- students_customer_read checks parent_student_links, while the staff policy on
-- parent_student_links previously checked students. PostgreSQL therefore could
-- recursively evaluate the two policies and raise:
--   infinite recursion detected in policy for relation "students"
--
-- These SECURITY DEFINER helpers perform the relationship lookups outside the
-- caller's RLS context while still restricting the result to auth.uid() and
-- the current user's school/branch.

create or replace function app_private.is_parent_of_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parent_student_links psl
    where psl.student_id = p_student_id
      and psl.parent_user_id = (select auth.uid())
  );
$$;

create or replace function app_private.can_manage_student_link(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select app_private.current_user_role()) = 'admin'::public.account_role
    or exists (
      select 1
      from public.students s
      where s.id = p_student_id
        and s.school_id = (select app_private.current_user_school_id())
        and (
          (select app_private.current_user_role()) = 'school_manager'::public.account_role
          or (
            (select app_private.current_user_role()) = 'branch_manager'::public.account_role
            and s.branch_id = (select app_private.current_user_branch_id())
          )
        )
    );
$$;

drop policy if exists "students_customer_read" on public.students;

create policy "students_customer_read"
on public.students
for select
to authenticated
using (
  user_id = (select auth.uid())
  or app_private.is_parent_of_student(id)
  or (select app_private.current_user_role()) = any (
    array[
      'admin'::public.account_role,
      'school_manager'::public.account_role,
      'branch_manager'::public.account_role
    ]
  )
);

drop policy if exists "parent_links_staff_manage" on public.parent_student_links;

create policy "parent_links_staff_manage"
on public.parent_student_links
for all
to authenticated
using (
  (select app_private.current_user_role()) = 'admin'::public.account_role
  or app_private.can_manage_student_link(student_id)
)
with check (
  (select app_private.current_user_role()) = 'admin'::public.account_role
  or app_private.can_manage_student_link(student_id)
);

revoke all on function app_private.is_parent_of_student(uuid) from public;
revoke all on function app_private.can_manage_student_link(uuid) from public;

grant execute on function app_private.is_parent_of_student(uuid) to authenticated;
grant execute on function app_private.can_manage_student_link(uuid) to authenticated;
