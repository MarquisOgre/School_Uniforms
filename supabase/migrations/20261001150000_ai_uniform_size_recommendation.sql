-- AI Uniform Intelligence: branch catalog mapping + measurement-based sizing
BEGIN;

CREATE TABLE IF NOT EXISTS public.uniform_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  normalized_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, normalized_name),
  UNIQUE (id, branch_id)
);

CREATE TABLE IF NOT EXISTS public.product_class_assignments (
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.uniform_classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, product_id, class_id)
);

CREATE OR REPLACE FUNCTION public.validate_product_class_assignment_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private
AS $$
DECLARE class_branch uuid;
BEGIN
  SELECT branch_id INTO class_branch FROM public.uniform_classes WHERE id = NEW.class_id;
  IF class_branch IS NULL OR class_branch <> NEW.branch_id THEN
    RAISE EXCEPTION 'Product class assignment branch and class belong to different branches';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_class_assignment_scope ON public.product_class_assignments;
CREATE TRIGGER validate_product_class_assignment_scope
BEFORE INSERT OR UPDATE ON public.product_class_assignments
FOR EACH ROW EXECUTE FUNCTION public.validate_product_class_assignment_scope();

CREATE TABLE IF NOT EXISTS public.variant_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  measurement_type text NOT NULL CHECK (measurement_type IN ('height','chest','waist','hip','shoulder','inseam','foot_length','age')),
  min_value numeric(8,2),
  ideal_value numeric(8,2),
  max_value numeric(8,2),
  unit text NOT NULL DEFAULT 'cm' CHECK (unit IN ('cm','in','years')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value),
  CHECK (ideal_value IS NULL OR ((min_value IS NULL OR ideal_value >= min_value) AND (max_value IS NULL OR ideal_value <= max_value)))
);

CREATE TABLE IF NOT EXISTS public.student_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  measurement_type text NOT NULL CHECK (measurement_type IN ('height','chest','waist','hip','shoulder','inseam','foot_length','age')),
  value numeric(8,2) NOT NULL CHECK (value > 0),
  unit text NOT NULL DEFAULT 'cm' CHECK (unit IN ('cm','in','years')),
  measured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'parent' CHECK (source IN ('parent','admin','import','ai')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uniform_classes_branch_order ON public.uniform_classes(branch_id, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_product_class_assignments_branch_class ON public.product_class_assignments(branch_id, class_id, product_id);
CREATE INDEX IF NOT EXISTS idx_variant_measurements_variant_type ON public.variant_measurements(variant_id, measurement_type);
CREATE INDEX IF NOT EXISTS idx_student_measurements_student_type ON public.student_measurements(student_id, measurement_type, measured_at DESC);

DROP TRIGGER IF EXISTS uniform_classes_set_updated_at ON public.uniform_classes;
CREATE TRIGGER uniform_classes_set_updated_at BEFORE UPDATE ON public.uniform_classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS variant_measurements_set_updated_at ON public.variant_measurements;
CREATE TRIGGER variant_measurements_set_updated_at BEFORE UPDATE ON public.variant_measurements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.uniform_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uniform_classes_staff_all ON public.uniform_classes;
CREATE POLICY uniform_classes_staff_all ON public.uniform_classes FOR ALL TO authenticated
USING (app_private.current_user_role() IN ('admin','school_manager','branch_manager'))
WITH CHECK (app_private.current_user_role() IN ('admin','school_manager','branch_manager'));

DROP POLICY IF EXISTS product_class_assignments_staff_all ON public.product_class_assignments;
CREATE POLICY product_class_assignments_staff_all ON public.product_class_assignments FOR ALL TO authenticated
USING (app_private.current_user_role() IN ('admin','school_manager','branch_manager'))
WITH CHECK (app_private.current_user_role() IN ('admin','school_manager','branch_manager'));

DROP POLICY IF EXISTS variant_measurements_staff_all ON public.variant_measurements;
CREATE POLICY variant_measurements_staff_all ON public.variant_measurements FOR ALL TO authenticated
USING (app_private.current_user_role() IN ('admin','school_manager','branch_manager'))
WITH CHECK (app_private.current_user_role() IN ('admin','school_manager','branch_manager'));

DROP POLICY IF EXISTS student_measurements_customer_read ON public.student_measurements;
CREATE POLICY student_measurements_customer_read ON public.student_measurements FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.parent_student_links psl WHERE psl.student_id = student_measurements.student_id AND psl.parent_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_measurements.student_id AND s.user_id = auth.uid())
  OR app_private.current_user_role() IN ('admin','school_manager','branch_manager')
);

DROP POLICY IF EXISTS student_measurements_customer_insert ON public.student_measurements;
CREATE POLICY student_measurements_customer_insert ON public.student_measurements FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.parent_student_links psl WHERE psl.student_id = student_measurements.student_id AND psl.parent_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_measurements.student_id AND s.user_id = auth.uid())
  OR app_private.current_user_role() IN ('admin','school_manager','branch_manager')
);

CREATE OR REPLACE FUNCTION public.get_uniform_ai_catalog(
  p_branch_id uuid, p_class_name text, p_gender public.gender_type DEFAULT NULL, p_product_query text DEFAULT NULL
)
RETURNS TABLE (
  product_id uuid, product_name text, category_name text, gender public.gender_type,
  variant_id uuid, sku text, size_label text, variant_name text, quantity_on_hand integer,
  measurement_type text, min_value numeric, ideal_value numeric, max_value numeric, unit text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, app_private
AS $$
  SELECT p.id, p.name, pc.name, p.gender, v.id, v.sku, v.size_label, v.variant_name,
         COALESCE(bi.quantity_on_hand, 0), vm.measurement_type, vm.min_value, vm.ideal_value, vm.max_value, vm.unit
  FROM public.branches b
  JOIN public.uniform_classes uc ON uc.branch_id = b.id AND uc.status = 'active'
    AND (lower(uc.name) = lower(trim(p_class_name))
      OR uc.normalized_name = lower(regexp_replace(trim(p_class_name), '[^a-z0-9]+', '', 'g')))
  JOIN public.product_class_assignments pca ON pca.branch_id = b.id AND pca.class_id = uc.id
  JOIN public.products p ON p.id = pca.product_id AND p.status = 'active'
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  JOIN public.product_variants v ON v.product_id = p.id AND v.status = 'active'
  LEFT JOIN public.branch_inventory bi ON bi.branch_id = b.id AND bi.variant_id = v.id
  LEFT JOIN public.variant_measurements vm ON vm.variant_id = v.id
  WHERE b.id = p_branch_id
    AND (p_gender IS NULL OR p.gender IN (p_gender, 'unisex'))
    AND (p_product_query IS NULL OR trim(p_product_query) = ''
      OR p.name ILIKE '%' || trim(p_product_query) || '%'
      OR COALESCE(pc.name,'') ILIKE '%' || trim(p_product_query) || '%')
  ORDER BY p.name, v.size_label, vm.measurement_type;
$$;

CREATE OR REPLACE FUNCTION public.resolve_uniform_class(p_branch_id uuid, p_class_name text)
RETURNS TABLE (class_id uuid, class_name text, sort_order integer)
LANGUAGE sql SECURITY DEFINER SET search_path = public, app_private
AS $$
  SELECT uc.id, uc.name, uc.sort_order
  FROM public.uniform_classes uc
  WHERE uc.branch_id = p_branch_id AND uc.status = 'active'
    AND (lower(uc.name) = lower(trim(p_class_name))
      OR uc.normalized_name = lower(regexp_replace(trim(p_class_name), '[^a-z0-9]+', '', 'g')))
  ORDER BY uc.sort_order LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_uniform_ai_catalog(uuid,text,public.gender_type,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_uniform_class(uuid,text) TO anon, authenticated;

COMMIT;
