-- Convert the School Uniforms data model from multi-school + branch
-- scoping to one school group with branch-only scoping.
-- Existing branch, customer, student and order data is preserved.

BEGIN;

DROP POLICY IF EXISTS branch_coupons_staff_manage ON public.branch_coupons;
DROP POLICY IF EXISTS inventory_staff_manage ON public.branch_inventory;
DROP POLICY IF EXISTS inventory_staff_read ON public.branch_inventory;
DROP POLICY IF EXISTS branch_packages_staff_manage ON public.branch_packages;
DROP POLICY IF EXISTS branch_payment_settings_staff_manage ON public.branch_payment_settings;
DROP POLICY IF EXISTS branch_products_staff_manage ON public.branch_products;
DROP POLICY IF EXISTS branches_admin_manage ON public.branches;
DROP POLICY IF EXISTS branches_scoped_read ON public.branches;
DROP POLICY IF EXISTS inventory_tx_staff ON public.inventory_transactions;
DROP POLICY IF EXISTS order_items_read ON public.order_items;
DROP POLICY IF EXISTS orders_customer_insert ON public.orders;
DROP POLICY IF EXISTS orders_customer_read ON public.orders;
DROP POLICY IF EXISTS orders_staff_update ON public.orders;
DROP POLICY IF EXISTS profiles_admin_manage ON public.profiles;
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS students_staff_manage ON public.students;
DROP POLICY IF EXISTS support_conversations_customer_insert ON public.support_conversations;
DROP POLICY IF EXISTS schools_admin_manage ON public.schools;
DROP POLICY IF EXISTS schools_public_read ON public.schools;

-- Replace the checkout RPC with a branch-only signature.
-- The body is transformed from the immediately preceding RPC definition so
-- product/package/inventory behavior remains unchanged.
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef('public.place_school_order(uuid,uuid,uuid,jsonb,jsonb,text,text,text)'::regprocedure)
  INTO v_def;

  v_def := regexp_replace(
    v_def,
    'place_school_order\(p_school_id uuid,\s*p_branch_id uuid,\s*p_student_id uuid',
    'place_school_order(p_branch_id uuid, p_student_id uuid',
    'g'
  );
  v_def := replace(v_def, 'v_profile_school uuid; ', '');
  v_def := replace(
    v_def,
    'select p.school_id,p.branch_id,p.role into v_profile_school,v_profile_branch,v_role',
    'select p.branch_id,p.role into v_profile_branch,v_role'
  );
  v_def := replace(
    v_def,
    'if v_profile_school is null or v_profile_branch is null or v_role',
    'if v_profile_branch is null or v_role'
  );
  v_def := replace(
    v_def,
    'if v_profile_school<>p_school_id or v_profile_branch<>p_branch_id then raise exception ''The selected school or branch does not match your signed-in account.'';',
    'if v_profile_branch<>p_branch_id then raise exception ''The selected branch does not match your signed-in account.'';'
  );
  v_def := replace(v_def, ' and s.school_id=p_school_id', '');
  v_def := replace(v_def, 's.school_id=p_school_id and ', '');
  v_def := replace(v_def, 'where b.id=p_branch_id and b.school_id=p_school_id and b.status=', 'where b.id=p_branch_id and b.status=');
  v_def := replace(
    v_def,
    'insert into public.orders(order_number,customer_user_id,student_id,school_id,branch_id,status,',
    'insert into public.orders(order_number,customer_user_id,student_id,branch_id,status,'
  );
  v_def := replace(
    v_def,
    'values(v_order_number,v_user_id,v_student_id,p_school_id,p_branch_id,',
    'values(v_order_number,v_user_id,v_student_id,p_branch_id,'
  );
  v_def := replace(
    v_def,
    'p_school_id,',
    ''
  );

  EXECUTE v_def;
END $$;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_branch_school_fk,
  DROP CONSTRAINT IF EXISTS orders_customer_scope_fk,
  DROP CONSTRAINT IF EXISTS orders_student_scope_fk;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_branch_school_fk,
  DROP CONSTRAINT IF EXISTS profiles_school_id_fkey,
  DROP CONSTRAINT IF EXISTS profiles_id_school_id_branch_id_key,
  DROP CONSTRAINT IF EXISTS profiles_school_id_branch_id_login_id_key;

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_branch_school_fk,
  DROP CONSTRAINT IF EXISTS students_school_id_fkey,
  DROP CONSTRAINT IF EXISTS students_id_school_id_branch_id_key,
  DROP CONSTRAINT IF EXISTS students_school_id_student_code_key;

ALTER TABLE public.branches
  DROP CONSTRAINT IF EXISTS branches_school_id_fkey,
  DROP CONSTRAINT IF EXISTS branches_id_school_id_key,
  DROP CONSTRAINT IF EXISTS branches_school_id_code_key;

ALTER TABLE public.support_conversations
  DROP CONSTRAINT IF EXISTS support_conversations_school_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT,
  ADD CONSTRAINT orders_customer_user_id_fkey
    FOREIGN KEY (customer_user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT orders_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT,
  ADD CONSTRAINT profiles_branch_login_id_key
    UNIQUE (branch_id, login_id),
  ADD CONSTRAINT profiles_customer_branch_required
    CHECK (role <> 'customer'::public.account_role OR branch_id IS NOT NULL);

ALTER TABLE public.students
  ADD CONSTRAINT students_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD CONSTRAINT students_branch_student_code_key
    UNIQUE (branch_id, student_code);

ALTER TABLE public.branches
  ADD CONSTRAINT branches_code_key UNIQUE (code);

ALTER TABLE public.orders DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.students DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.branches DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.support_conversations DROP COLUMN IF EXISTS school_id;

DROP FUNCTION IF EXISTS app_private.current_user_school_id();
DROP FUNCTION IF EXISTS private.current_user_school_id();

DROP TABLE IF EXISTS public.schools;

CREATE OR REPLACE FUNCTION app_private.can_manage_branch(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  select
    (select app_private.current_user_role()) = 'admin'::public.account_role
    or (select app_private.current_user_role()) = 'school_manager'::public.account_role
    or (
      (select app_private.current_user_role()) = 'branch_manager'::public.account_role
      and p_branch_id = (select app_private.current_user_branch_id())
    );
$$;

CREATE OR REPLACE FUNCTION app_private.can_manage_student_link(p_student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  select
    (select app_private.current_user_role()) = 'admin'::public.account_role
    or (
      (select app_private.current_user_role()) = 'school_manager'::public.account_role
      and exists (select 1 from public.students s where s.id=p_student_id)
    )
    or (
      (select app_private.current_user_role()) = 'branch_manager'::public.account_role
      and exists (
        select 1 from public.students s
        where s.id=p_student_id
          and s.branch_id=(select app_private.current_user_branch_id())
      )
    );
$$;

CREATE POLICY branches_admin_manage ON public.branches
FOR ALL TO authenticated
USING ((select app_private.current_user_role()) IN ('admin'::public.account_role,'school_manager'::public.account_role))
WITH CHECK ((select app_private.current_user_role()) IN ('admin'::public.account_role,'school_manager'::public.account_role));

CREATE POLICY branches_scoped_read ON public.branches
FOR SELECT TO authenticated
USING ((select app_private.current_user_role()) IN ('admin'::public.account_role,'school_manager'::public.account_role,'branch_manager'::public.account_role));

CREATE POLICY branch_coupons_staff_manage ON public.branch_coupons FOR ALL TO authenticated
USING (app_private.can_manage_branch(branch_id)) WITH CHECK (app_private.can_manage_branch(branch_id));

CREATE POLICY inventory_staff_manage ON public.branch_inventory FOR ALL TO authenticated
USING (app_private.can_manage_branch(branch_id)) WITH CHECK (app_private.can_manage_branch(branch_id));

CREATE POLICY inventory_staff_read ON public.branch_inventory FOR SELECT TO authenticated
USING (app_private.can_manage_branch(branch_id));

CREATE POLICY branch_packages_staff_manage ON public.branch_packages FOR ALL TO authenticated
USING (app_private.can_manage_branch(branch_id)) WITH CHECK (app_private.can_manage_branch(branch_id));

CREATE POLICY branch_payment_settings_staff_manage ON public.branch_payment_settings FOR ALL TO authenticated
USING (app_private.can_manage_branch(branch_id)) WITH CHECK (app_private.can_manage_branch(branch_id));

CREATE POLICY branch_products_staff_manage ON public.branch_products FOR ALL TO authenticated
USING (app_private.can_manage_branch(branch_id)) WITH CHECK (app_private.can_manage_branch(branch_id));

CREATE POLICY inventory_tx_staff ON public.inventory_transactions FOR ALL TO authenticated
USING (app_private.can_manage_branch(branch_id)) WITH CHECK (app_private.can_manage_branch(branch_id));

CREATE POLICY order_items_read ON public.order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id=order_items.order_id
      AND (o.customer_user_id=(select auth.uid()) OR app_private.can_manage_branch(o.branch_id))
  )
);

CREATE POLICY profiles_admin_manage ON public.profiles FOR ALL TO authenticated
USING (
  (select app_private.current_user_role())='admin'::public.account_role
  OR (select app_private.current_user_role())='school_manager'::public.account_role
  OR (
    (select app_private.current_user_role())='branch_manager'::public.account_role
    AND branch_id=(select app_private.current_user_branch_id())
  )
)
WITH CHECK (
  (select app_private.current_user_role())='admin'::public.account_role
  OR (select app_private.current_user_role())='school_manager'::public.account_role
  OR (
    (select app_private.current_user_role())='branch_manager'::public.account_role
    AND branch_id=(select app_private.current_user_branch_id())
  )
);

CREATE POLICY profiles_self_read ON public.profiles FOR SELECT TO authenticated
USING (
  id=(select auth.uid())
  OR (select app_private.current_user_role())='admin'::public.account_role
  OR app_private.can_manage_branch(branch_id)
);

CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated
USING (id=(select auth.uid()) AND role='customer'::public.account_role)
WITH CHECK (
  id=(select auth.uid())
  AND role='customer'::public.account_role
  AND NOT (branch_id IS DISTINCT FROM (select app_private.current_user_branch_id()))
  AND NOT (login_id IS DISTINCT FROM (select app_private.current_user_login_id()))
);

CREATE POLICY students_staff_manage ON public.students FOR ALL TO authenticated
USING ((select app_private.current_user_role())='admin'::public.account_role OR app_private.can_manage_branch(branch_id))
WITH CHECK ((select app_private.current_user_role())='admin'::public.account_role OR app_private.can_manage_branch(branch_id));

CREATE POLICY orders_customer_insert ON public.orders FOR INSERT TO authenticated
WITH CHECK (customer_user_id=(select auth.uid()) AND branch_id=(select app_private.current_user_branch_id()));

CREATE POLICY orders_customer_read ON public.orders FOR SELECT TO authenticated
USING (customer_user_id=(select auth.uid()) OR app_private.can_manage_branch(branch_id));

CREATE POLICY orders_staff_update ON public.orders FOR UPDATE TO authenticated
USING (app_private.can_manage_branch(branch_id))
WITH CHECK (app_private.can_manage_branch(branch_id));

CREATE POLICY support_conversations_customer_insert ON public.support_conversations
FOR INSERT TO authenticated
WITH CHECK (customer_user_id=(select auth.uid()) AND branch_id=(select app_private.current_user_branch_id()));

COMMIT;
