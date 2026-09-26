-- Allow public visitors to read published product reviews while keeping review creation restricted to signed-in customers.

drop policy if exists product_reviews_read on public.product_reviews;

create policy product_reviews_read
on public.product_reviews
for select
to anon, authenticated
using (
  status = 'published'
  or customer_user_id = (select auth.uid())
  or (
    (select app_private.current_user_role()) = any (
      array['admin'::account_role, 'school_manager'::account_role, 'branch_manager'::account_role]
    )
  )
);

grant select on table public.product_reviews to anon, authenticated;
grant insert, update on table public.product_reviews to authenticated;
