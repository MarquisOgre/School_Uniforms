-- Reusable uniform sizing template: 3 school levels x Boys/Girls.
BEGIN;

CREATE TABLE IF NOT EXISTS public.uniform_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  level_code text NOT NULL CHECK (level_code IN ('early_years','primary','secondary')),
  gender text NOT NULL CHECK (gender IN ('boys','girls')),
  sort_order integer NOT NULL DEFAULT 0,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);

CREATE TABLE IF NOT EXISTS public.uniform_group_classes (
  group_id uuid NOT NULL REFERENCES public.uniform_groups(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.uniform_classes(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, class_id)
);

CREATE TABLE IF NOT EXISTS public.product_group_assignments (
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.uniform_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, product_id, group_id)
);

CREATE TABLE IF NOT EXISTS public.variant_group_assignments (
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.uniform_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (variant_id, group_id)
);

CREATE OR REPLACE FUNCTION public.validate_uniform_group_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private
AS $$
DECLARE group_school uuid; product_school uuid; branch_school uuid; class_school uuid;
BEGIN
  IF TG_TABLE_NAME = 'uniform_group_classes' THEN
    SELECT school_id INTO group_school FROM public.uniform_groups WHERE id = NEW.group_id;
    SELECT school_id INTO class_school FROM public.uniform_classes WHERE id = NEW.class_id;
    IF group_school IS NULL OR class_school IS NULL OR group_school <> class_school THEN
      RAISE EXCEPTION 'Uniform group and class belong to different schools';
    END IF;
  ELSIF TG_TABLE_NAME = 'product_group_assignments' THEN
    SELECT school_id INTO group_school FROM public.uniform_groups WHERE id = NEW.group_id;
    SELECT school_id INTO branch_school FROM public.branches WHERE id = NEW.branch_id;
    IF group_school IS NULL OR branch_school IS NULL OR group_school <> branch_school THEN
      RAISE EXCEPTION 'Uniform group and branch belong to different schools';
    END IF;
  ELSIF TG_TABLE_NAME = 'variant_group_assignments' THEN
    SELECT school_id INTO group_school FROM public.uniform_groups WHERE id = NEW.group_id;
    SELECT b.school_id INTO product_school
      FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      JOIN public.branches b ON b.school_id = group_school
      WHERE v.id = NEW.variant_id
      LIMIT 1;
    IF group_school IS NULL OR product_school IS NULL OR group_school <> product_school THEN
      RAISE EXCEPTION 'Uniform group and variant cannot be validated for the same school';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_uniform_group_scope_classes ON public.uniform_group_classes;
CREATE TRIGGER validate_uniform_group_scope_classes
BEFORE INSERT OR UPDATE ON public.uniform_group_classes
FOR EACH ROW EXECUTE FUNCTION public.validate_uniform_group_scope();

DROP TRIGGER IF EXISTS validate_uniform_group_scope_products ON public.product_group_assignments;
CREATE TRIGGER validate_uniform_group_scope_products
BEFORE INSERT OR UPDATE ON public.product_group_assignments
FOR EACH ROW EXECUTE FUNCTION public.validate_uniform_group_scope();

DROP TRIGGER IF EXISTS validate_uniform_group_scope_variants ON public.variant_group_assignments;
CREATE TRIGGER validate_uniform_group_scope_variants
BEFORE INSERT OR UPDATE ON public.variant_group_assignments
FOR EACH ROW EXECUTE FUNCTION public.validate_uniform_group_scope();

DROP TRIGGER IF EXISTS uniform_groups_set_updated_at ON public.uniform_groups;
CREATE TRIGGER uniform_groups_set_updated_at BEFORE UPDATE ON public.uniform_groups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_uniform_groups_school_level_gender ON public.uniform_groups(school_id, level_code, gender);
CREATE INDEX IF NOT EXISTS idx_uniform_group_classes_class ON public.uniform_group_classes(class_id, group_id);
CREATE INDEX IF NOT EXISTS idx_product_group_assignments_branch_group ON public.product_group_assignments(branch_id, group_id, product_id);
CREATE INDEX IF NOT EXISTS idx_variant_group_assignments_group ON public.variant_group_assignments(group_id, variant_id);

ALTER TABLE public.uniform_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniform_group_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_group_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uniform_groups_staff_all ON public.uniform_groups;
CREATE POLICY uniform_groups_staff_all ON public.uniform_groups FOR ALL TO authenticated
USING (app_private.current_user_role() IN ('admin','school_manager','branch_manager'))
WITH CHECK (app_private.current_user_role() IN ('admin','school_manager','branch_manager'));

DROP POLICY IF EXISTS uniform_group_classes_staff_all ON public.uniform_group_classes;
CREATE POLICY uniform_group_classes_staff_all ON public.uniform_group_classes FOR ALL TO authenticated
USING (app_private.current_user_role() IN ('admin','school_manager','branch_manager'))
WITH CHECK (app_private.current_user_role() IN ('admin','school_manager','branch_manager'));

DROP POLICY IF EXISTS product_group_assignments_staff_all ON public.product_group_assignments;
CREATE POLICY product_group_assignments_staff_all ON public.product_group_assignments FOR ALL TO authenticated
USING (app_private.current_user_role() IN ('admin','school_manager','branch_manager'))
WITH CHECK (app_private.current_user_role() IN ('admin','school_manager','branch_manager'));

DROP POLICY IF EXISTS variant_group_assignments_staff_all ON public.variant_group_assignments;
CREATE POLICY variant_group_assignments_staff_all ON public.variant_group_assignments FOR ALL TO authenticated
USING (app_private.current_user_role() IN ('admin','school_manager','branch_manager'))
WITH CHECK (app_private.current_user_role() IN ('admin','school_manager','branch_manager'));

CREATE OR REPLACE FUNCTION public.initialize_uniform_group_template(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private
AS $$
DECLARE
  g record;
  c text;
  cid uuid;
  gid uuid;
  group_defs record;
BEGIN
  IF app_private.current_user_role() NOT IN ('admin','school_manager') THEN
    RAISE EXCEPTION 'Only school administrators can initialize the uniform template';
  END IF;

  FOR group_defs IN
    SELECT * FROM (VALUES
      ('EARLY_YEARS_BOYS','Early Years Boys','early_years','boys',10),
      ('EARLY_YEARS_GIRLS','Early Years Girls','early_years','girls',20),
      ('PRIMARY_BOYS','Primary Boys','primary','boys',30),
      ('PRIMARY_GIRLS','Primary Girls','primary','girls',40),
      ('SECONDARY_BOYS','Secondary Boys','secondary','boys',50),
      ('SECONDARY_GIRLS','Secondary Girls','secondary','girls',60)
    ) AS x(code,name,level_code,gender,sort_order)
  LOOP
    INSERT INTO public.uniform_groups(school_id,code,name,level_code,gender,sort_order,status)
    VALUES(p_school_id,group_defs.code,group_defs.name,group_defs.level_code,group_defs.gender,group_defs.sort_order,'active')
    ON CONFLICT (school_id,code) DO UPDATE SET name=EXCLUDED.name, level_code=EXCLUDED.level_code, gender=EXCLUDED.gender
    RETURNING id INTO gid;

    IF group_defs.level_code = 'early_years' THEN
      FOREACH c IN ARRAY ARRAY['Nursery','LKG','UKG'] LOOP
        INSERT INTO public.uniform_classes(school_id,name,normalized_name,sort_order,status)
        VALUES(p_school_id,c,lower(regexp_replace(c,'[^a-z0-9]+','','g')),array_position(ARRAY['Nursery','LKG','UKG'],c),'active')
        ON CONFLICT (school_id,normalized_name) DO UPDATE SET name=EXCLUDED.name
        RETURNING id INTO cid;
        INSERT INTO public.uniform_group_classes(group_id,class_id) VALUES(gid,cid) ON CONFLICT DO NOTHING;
      END LOOP;
    ELSIF group_defs.level_code = 'primary' THEN
      FOR c IN SELECT 'Class ' || n FROM generate_series(1,5) n LOOP
        INSERT INTO public.uniform_classes(school_id,name,normalized_name,sort_order,status)
        VALUES(p_school_id,c,lower(regexp_replace(c,'[^a-z0-9]+','','g')),split_part(c,' ',2)::integer,'active')
        ON CONFLICT (school_id,normalized_name) DO UPDATE SET name=EXCLUDED.name
        RETURNING id INTO cid;
        INSERT INTO public.uniform_group_classes(group_id,class_id) VALUES(gid,cid) ON CONFLICT DO NOTHING;
      END LOOP;
    ELSE
      FOR c IN SELECT 'Class ' || n FROM generate_series(6,10) n LOOP
        INSERT INTO public.uniform_classes(school_id,name,normalized_name,sort_order,status)
        VALUES(p_school_id,c,lower(regexp_replace(c,'[^a-z0-9]+','','g')),split_part(c,' ',2)::integer,'active')
        ON CONFLICT (school_id,normalized_name) DO UPDATE SET name=EXCLUDED.name
        RETURNING id INTO cid;
        INSERT INTO public.uniform_group_classes(group_id,class_id) VALUES(gid,cid) ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.initialize_uniform_group_template(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_uniform_ai_catalog(
  p_branch_id uuid, p_class_name text, p_gender public.gender_type DEFAULT NULL, p_product_query text DEFAULT NULL
)
RETURNS TABLE (
  group_id uuid, group_name text, level_code text, group_gender text,
  product_id uuid, product_name text, category_name text, gender public.gender_type,
  variant_id uuid, sku text, size_label text, variant_name text, quantity_on_hand integer,
  measurement_type text, min_value numeric, ideal_value numeric, max_value numeric, unit text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, app_private
AS $$
  SELECT g.id, g.name, g.level_code, g.gender,
         p.id, p.name, pc.name, p.gender, v.id, v.sku, v.size_label, v.variant_name,
         COALESCE(bi.quantity_on_hand, 0), vm.measurement_type, vm.min_value, vm.ideal_value, vm.max_value, vm.unit
  FROM branches b
  JOIN uniform_classes uc ON uc.school_id = b.school_id AND uc.status = 'active'
  JOIN uniform_group_classes ugc ON ugc.class_id = uc.id
  JOIN uniform_groups g ON g.id = ugc.group_id AND g.status = 'active'
    AND (p_gender IS NULL OR g.gender = CASE WHEN p_gender = 'unisex' THEN g.gender ELSE p_gender::text END)
    AND (lower(uc.name) = lower(trim(p_class_name))
      OR uc.normalized_name = lower(regexp_replace(trim(p_class_name), '[^a-z0-9]+', '', 'g')))
  JOIN product_group_assignments pga ON pga.branch_id = b.id AND pga.group_id = g.id
  JOIN products p ON p.id = pga.product_id AND p.status = 'active'
  JOIN product_variants v ON v.product_id = p.id AND v.status = 'active'
  JOIN variant_group_assignments vga ON v.variant_id = v.id AND vga.group_id = g.id
  LEFT JOIN product_categories pc ON pc.id = p.category_id
  LEFT JOIN branch_inventory bi ON bi.branch_id = b.id AND bi.variant_id = v.id
  LEFT JOIN variant_measurements vm ON vm.variant_id = v.id
  WHERE b.id = p_branch_id
    AND (p_gender IS NULL OR p.gender IN (p_gender, 'unisex'))
    AND (p_product_query IS NULL OR trim(p_product_query) = ''
      OR p.name ILIKE '%' || trim(p_product_query) || '%'
      OR COALESCE(pc.name,'') ILIKE '%' || trim(p_product_query) || '%')
  ORDER BY g.sort_order, p.name, v.size_label, vm.measurement_type;
$$;

GRANT EXECUTE ON FUNCTION public.get_uniform_ai_catalog(uuid,text,public.gender_type,text) TO anon, authenticated;

COMMIT;
