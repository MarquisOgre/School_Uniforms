-- Correct Narayana accessory catalogue and remove unsupported products.
-- Accessories are separate products so the AI assistant can recommend them
-- only where the uniform group allows them.
BEGIN;

DO $$
DECLARE
  v_school_id uuid;
  v_branch_id uuid;
  v_product_id uuid;
  v_group_id uuid;
BEGIN
  SELECT id INTO v_school_id FROM public.schools WHERE code='NARAYANA' LIMIT 1;
  IF v_school_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_branch_id
  FROM public.branches
  WHERE branches.school_id=v_school_id AND branches.code='CBSE'
  LIMIT 1;

  -- Remove products that have no supported class assignment from the active catalogue.
  UPDATE public.products
  SET status='inactive'::record_status, updated_at=now()
  WHERE slug IN (
    'narayana-cbse-uniform-binoform-01',
    'narayana-cbse-uniform-grils-coat-01',
    'narayana-cbse-uniform-boys-blazer-01'
  );

  IF v_branch_id IS NOT NULL THEN
    UPDATE public.branch_products
    SET is_visible=false, updated_at=now()
    WHERE branch_id=v_branch_id
      AND product_id IN (
        SELECT id FROM public.products
        WHERE slug IN (
          'narayana-cbse-uniform-binoform-01',
          'narayana-cbse-uniform-grils-coat-01',
          'narayana-cbse-uniform-boys-blazer-01'
        )
      );
  END IF;

  -- Remove any stale group/variant eligibility for those products.
  DELETE FROM public.variant_group_assignments
  WHERE variant_id IN (
    SELECT v.id
    FROM public.product_variants v
    JOIN public.products p ON p.id=v.product_id
    WHERE p.slug IN (
      'narayana-cbse-uniform-binoform-01',
      'narayana-cbse-uniform-grils-coat-01',
      'narayana-cbse-uniform-boys-blazer-01'
    )
  );

  DELETE FROM public.product_group_assignments
  WHERE product_id IN (
    SELECT id FROM public.products
    WHERE slug IN (
      'narayana-cbse-uniform-binoform-01',
      'narayana-cbse-uniform-grils-coat-01',
      'narayana-cbse-uniform-boys-blazer-01'
    )
  );

  -- Shoes: regular-school footwear. Price is intentionally 0 until the
  -- school's actual accessory price is configured in the admin catalogue.
  INSERT INTO public.products
    (name,slug,description,gender,image_url,base_price,status,discount_percentage,offer_price,brand,image_gallery)
  VALUES
    ('NARAYANA SCHOOL SHOES','narayana-school-shoes-01',
     'Regular school shoes for the Narayana CBSE uniform. Configure the branch price before sale.',
     'unisex','',0,'active'::record_status,0,0,'Narayana', '[]'::jsonb)
  ON CONFLICT (slug) DO UPDATE SET
    name=EXCLUDED.name,
    description=EXCLUDED.description,
    gender=EXCLUDED.gender,
    status='active'::record_status,
    updated_at=now();

  SELECT id INTO v_product_id FROM public.products WHERE slug='narayana-school-shoes-01';
  INSERT INTO public.product_variants (product_id,sku,size_label,variant_name,price,status)
  SELECT v_product_id,'NARAYANA-SHOES-'||s,'Size '||s,'Narayana School Shoes - Size '||s,0,'active'::record_status
  FROM unnest(ARRAY['10','11','12','13','1','2','3','4','5','6','7']) AS x(s)
  ON CONFLICT (sku) DO UPDATE SET status='active'::record_status, updated_at=now();

  -- School belt: common regular-uniform accessory for the secondary/eTechno groups.
  INSERT INTO public.products
    (name,slug,description,gender,image_url,base_price,status,discount_percentage,offer_price,brand,image_gallery)
  VALUES
    ('NARAYANA SCHOOL BELT','narayana-school-belt-01',
     'Narayana school belt. Configure the branch price before sale.',
     'unisex','',0,'active'::record_status,0,0,'Narayana', '[]'::jsonb)
  ON CONFLICT (slug) DO UPDATE SET
    name=EXCLUDED.name,
    description=EXCLUDED.description,
    gender=EXCLUDED.gender,
    status='active'::record_status,
    updated_at=now();

  SELECT id INTO v_product_id FROM public.products WHERE slug='narayana-school-belt-01';
  INSERT INTO public.product_variants (product_id,sku,size_label,variant_name,price,status)
  SELECT v_product_id,'NARAYANA-BELT-'||s,s,'Narayana School Belt - Size '||s,0,'active'::record_status
  FROM unnest(ARRAY['24','26','28','30','32','34','36','38','40']) AS x(s)
  ON CONFLICT (sku) DO UPDATE SET status='active'::record_status, updated_at=now();

  -- School tie: common regular-uniform accessory for the secondary/eTechno groups.
  INSERT INTO public.products
    (name,slug,description,gender,image_url,base_price,status,discount_percentage,offer_price,brand,image_gallery)
  VALUES
    ('NARAYANA SCHOOL TIE','narayana-school-tie-01',
     'Narayana school tie. Configure the branch price before sale.',
     'unisex','',0,'active'::record_status,0,0,'Narayana', '[]'::jsonb)
  ON CONFLICT (slug) DO UPDATE SET
    name=EXCLUDED.name,
    description=EXCLUDED.description,
    gender=EXCLUDED.gender,
    status='active'::record_status,
    updated_at=now();

  SELECT id INTO v_product_id FROM public.products WHERE slug='narayana-school-tie-01';
  INSERT INTO public.product_variants (product_id,sku,size_label,variant_name,price,status)
  VALUES (v_product_id,'NARAYANA-TIE-FREE','FREE','Narayana School Tie - Free Size',0,'active'::record_status)
  ON CONFLICT (sku) DO UPDATE SET status='active'::record_status, updated_at=now();

  -- Assign shoes to all six regular groups.
  FOR v_group_id IN
    SELECT id FROM public.uniform_groups
    WHERE school_id=v_school_id
      AND code IN (
        'EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS',
        'PRIMARY_BOYS','PRIMARY_GIRLS',
        'SECONDARY_BOYS','SECONDARY_GIRLS'
      )
  LOOP
    INSERT INTO public.product_group_assignments(branch_id,product_id,group_id)
    VALUES(v_branch_id,(SELECT id FROM public.products WHERE slug='narayana-school-shoes-01'),v_group_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.variant_group_assignments(variant_id,group_id)
    SELECT v.id,v_group_id
    FROM public.product_variants v
    WHERE v.product_id=(SELECT id FROM public.products WHERE slug='narayana-school-shoes-01')
      AND v.status='active'
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Belt and tie are explicitly documented as completing the eTechno/Class VI-X
  -- uniform, so assign them to the two Secondary groups only.
  FOR v_group_id IN
    SELECT id FROM public.uniform_groups
    WHERE school_id=v_school_id
      AND code IN ('SECONDARY_BOYS','SECONDARY_GIRLS')
  LOOP
    INSERT INTO public.product_group_assignments(branch_id,product_id,group_id)
    VALUES(v_branch_id,(SELECT id FROM public.products WHERE slug='narayana-school-belt-01'),v_group_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.product_group_assignments(branch_id,product_id,group_id)
    VALUES(v_branch_id,(SELECT id FROM public.products WHERE slug='narayana-school-tie-01'),v_group_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.variant_group_assignments(variant_id,group_id)
    SELECT v.id,v_group_id
    FROM public.product_variants v
    WHERE v.product_id IN (
      SELECT id FROM public.products
      WHERE slug IN ('narayana-school-belt-01','narayana-school-tie-01')
    ) AND v.status='active'
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Make the accessory products available in the Narayana CBSE branch.
  IF v_branch_id IS NOT NULL THEN
    INSERT INTO public.branch_products(branch_id,product_id,branch_price,is_visible)
    SELECT v_branch_id,p.id,COALESCE(p.offer_price,p.base_price),true
    FROM public.products p
    WHERE p.slug IN (
      'narayana-school-shoes-01',
      'narayana-school-belt-01',
      'narayana-school-tie-01'
    )
    ON CONFLICT (branch_id,product_id) DO UPDATE SET
      is_visible=true,
      branch_price=EXCLUDED.branch_price,
      updated_at=now();

    INSERT INTO public.branch_inventory
      (branch_id,product_id,variant_id,quantity_on_hand,reorder_level)
    SELECT v_branch_id,v.product_id,v.id,0,0
    FROM public.product_variants v
    JOIN public.products p ON p.id=v.product_id
    WHERE p.slug IN (
      'narayana-school-shoes-01',
      'narayana-school-belt-01',
      'narayana-school-tie-01'
    ) AND v.status='active'
    ON CONFLICT (branch_id,variant_id) DO NOTHING;
  END IF;
END $$;

COMMIT;
