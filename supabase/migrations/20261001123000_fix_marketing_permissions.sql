-- Fix Commerce & CMS Marketing access.
-- Table privileges are required before RLS policies can evaluate row access.
grant select, insert, update, delete on table public.promotions to authenticated;
grant select, insert, update, delete on table public.product_relations to authenticated;

alter table public.promotions enable row level security;
alter table public.product_relations enable row level security;

drop policy if exists promotions_staff_select on public.promotions;
drop policy if exists promotions_staff_insert on public.promotions;
drop policy if exists promotions_staff_update on public.promotions;
drop policy if exists promotions_staff_delete on public.promotions;

create policy promotions_staff_select on public.promotions for select to authenticated using (
  (select app_private.current_user_role()) = any(array['admin'::account_role,'school_manager'::account_role])
  or ((branch_id is not null) and (select app_private.can_manage_branch(branch_id)))
);
create policy promotions_staff_insert on public.promotions for insert to authenticated with check (
  (select app_private.current_user_role()) = any(array['admin'::account_role,'school_manager'::account_role])
  or ((branch_id is not null) and (select app_private.can_manage_branch(branch_id)))
);
create policy promotions_staff_update on public.promotions for update to authenticated using (
  (select app_private.current_user_role()) = any(array['admin'::account_role,'school_manager'::account_role])
  or ((branch_id is not null) and (select app_private.can_manage_branch(branch_id)))
) with check (
  (select app_private.current_user_role()) = any(array['admin'::account_role,'school_manager'::account_role])
  or ((branch_id is not null) and (select app_private.can_manage_branch(branch_id)))
);
create policy promotions_staff_delete on public.promotions for delete to authenticated using (
  (select app_private.current_user_role()) = any(array['admin'::account_role,'school_manager'::account_role])
  or ((branch_id is not null) and (select app_private.can_manage_branch(branch_id)))
);

drop policy if exists product_relations_staff_select on public.product_relations;
drop policy if exists product_relations_staff_insert on public.product_relations;
drop policy if exists product_relations_staff_update on public.product_relations;
drop policy if exists product_relations_staff_delete on public.product_relations;

create policy product_relations_staff_select on public.product_relations for select to authenticated using (
  (select app_private.current_user_role()) = any(array['admin'::account_role,'school_manager'::account_role,'branch_manager'::account_role])
);
create policy product_relations_staff_insert on public.product_relations for insert to authenticated with check (
  (select app_private.current_user_role()) = any(array['admin'::account_role,'school_manager'::account_role,'branch_manager'::account_role])
);
create policy product_relations_staff_update on public.product_relations for update to authenticated using (
  (select app_private.current_user_role()) = any(array['admin'::account_role,'school_manager'::account_role,'branch_manager'::account_role])
) with check (
  (select app_private.current_user_role()) = any(array['admin'::account_role,'school_manager'::account_role,'branch_manager'::account_role])
);
create policy product_relations_staff_delete on public.product_relations for delete to authenticated using (
  (select app_private.current_user_role()) = any(array['admin'::account_role,'school_manager'::account_role,'branch_manager'::account_role])
);