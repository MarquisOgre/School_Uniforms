-- Assign the current Narayana catalogue to the reusable six-group template.
-- Products remain shared; only group eligibility and variant eligibility are assigned.
BEGIN;

DO $$
DECLARE
  school_id uuid;
  branch_id uuid;
  g uuid;
  p uuid;
BEGIN
  SELECT id INTO school_id FROM public.schools WHERE code='NARAYANA' LIMIT 1;
  IF school_id IS NULL THEN RETURN; END IF;

  PERFORM public.initialize_uniform_group_template(school_id);

  SELECT id INTO branch_id FROM public.branches WHERE school_id=school_id AND code='CBSE' LIMIT 1;
  IF branch_id IS NULL THEN RETURN; END IF;

  -- Helper: assign a product to a group.
  -- Product eligibility is deliberately separate from variant eligibility.
  -- This lets the same product exist in multiple groups with different sizes.
  FOR g,p IN
    SELECT ug.id, pr.id
    FROM public.uniform_groups ug
    JOIN public.products pr ON
      (
        -- Explicit LKG/UKG frock belongs only to Early Years Girls.
        (pr.slug='narayana-cbse-uniform-frock-lkg-ukg-01' AND ug.code='EARLY_YEARS_GIRLS')
        -- Boys early/primary shirt and shorts.
        OR (pr.slug='narayana-cbse-uniform-boys-half-hands-shirt-01' AND ug.code IN ('EARLY_YEARS_BOYS','PRIMARY_BOYS'))
        OR (pr.slug='narayana-cbse-uniform-shorts-01' AND ug.code IN ('EARLY_YEARS_BOYS','PRIMARY_BOYS'))
        -- Girls shirt/skirt.
        OR (pr.slug='narayana-cbse-uniform-girls-shirt-01' AND ug.code IN ('EARLY_YEARS_GIRLS','PRIMARY_GIRLS','SECONDARY_GIRLS'))
        OR (pr.slug='narayana-cbse-uniform-divider-skirt-01' AND ug.code IN ('PRIMARY_GIRLS','SECONDARY_GIRLS'))
        OR (pr.slug='narayana-cbse-uniform-flit-normal-skirt-01' AND ug.code IN ('PRIMARY_GIRLS','SECONDARY_GIRLS'))
        -- Girls traditional/winter pieces.
        OR (pr.slug='narayana-cbse-uniform-chudi-set-01' AND ug.code='SECONDARY_GIRLS')
        OR (pr.slug='narayana-cbse-uniform-grils-coat-01' AND ug.code IN ('PRIMARY_GIRLS','SECONDARY_GIRLS'))
        -- Boys trousers/blazer.
        OR (pr.slug='narayana-cbse-uniform-boys-elastic-pant-back-elastic-01' AND ug.code IN ('PRIMARY_BOYS','SECONDARY_BOYS'))
        OR (pr.slug='narayana-cbse-uniform-gents-pant-fix-waist-01' AND ug.code IN ('PRIMARY_BOYS','SECONDARY_BOYS'))
        OR (pr.slug='narayana-cbse-uniform-boys-blazer-01' AND ug.code IN ('PRIMARY_BOYS','SECONDARY_BOYS'))
        -- Full-hands shirt is shared across age ranges.
        OR (pr.slug='narayana-cbse-uniform-boys-girls-full-hands-shirt-01' AND ug.code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS','SECONDARY_BOYS','SECONDARY_GIRLS'))
        -- Binoform is retained as a shared school garment until the school overrides its mapping.
        OR (pr.slug='narayana-cbse-uniform-binoform-01' AND ug.code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS'))
        -- Socks are shared accessories.
        OR (pr.slug IN ('narayana-cbse-socks-3-sets-drak-grey-colour-01','narayana-socks-3-sets-01') AND ug.code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS','SECONDARY_BOYS','SECONDARY_GIRLS'))
        -- Sportswear is shared; variants are split below.
        OR (pr.slug LIKE 'uniform-sports-t-shirt-%' AND ug.code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS','SECONDARY_BOYS','SECONDARY_GIRLS'))
        OR (pr.slug LIKE 'uniform-sports-pant-%' AND ug.code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS','SECONDARY_BOYS','SECONDARY_GIRLS'))
      )
    WHERE ug.school_id=school_id AND pr.status='active'
  LOOP
    INSERT INTO public.product_group_assignments(branch_id,product_id,group_id)
    VALUES(branch_id,p,g) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Variant sizing policy for the current Narayana catalogue.
  -- Smaller numbered variants are assigned to Early Years; middle sizes to Primary;
  -- larger sizes to Secondary. This is an initial catalogue mapping and can be
  -- overridden by the admin at any time in AI Uniform Setup.
  FOR g,p IN
    SELECT ug.id, pr.id
    FROM public.uniform_groups ug
    JOIN public.products pr ON
      (pr.slug='narayana-cbse-uniform-boys-half-hands-shirt-01' AND ug.code IN ('EARLY_YEARS_BOYS','PRIMARY_BOYS'))
      OR (pr.slug='narayana-cbse-uniform-girls-shirt-01' AND ug.code IN ('EARLY_YEARS_GIRLS','PRIMARY_GIRLS','SECONDARY_GIRLS'))
      OR (pr.slug='narayana-cbse-uniform-boys-girls-full-hands-shirt-01' AND ug.code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS','SECONDARY_BOYS','SECONDARY_GIRLS'))
      OR (pr.slug='narayana-cbse-uniform-shorts-01' AND ug.code IN ('EARLY_YEARS_BOYS','PRIMARY_BOYS'))
      OR (pr.slug='narayana-cbse-uniform-divider-skirt-01' AND ug.code IN ('PRIMARY_GIRLS','SECONDARY_GIRLS'))
      OR (pr.slug='narayana-cbse-uniform-flit-normal-skirt-01' AND ug.code IN ('PRIMARY_GIRLS','SECONDARY_GIRLS'))
      OR (pr.slug='narayana-cbse-uniform-chudi-set-01' AND ug.code='SECONDARY_GIRLS')
      OR (pr.slug='narayana-cbse-uniform-binoform-01' AND ug.code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS'))
      OR (pr.slug='narayana-cbse-uniform-boys-elastic-pant-back-elastic-01' AND ug.code IN ('PRIMARY_BOYS','SECONDARY_BOYS'))
      OR (pr.slug='narayana-cbse-uniform-gents-pant-fix-waist-01' AND ug.code IN ('PRIMARY_BOYS','SECONDARY_BOYS'))
      OR (pr.slug='narayana-cbse-uniform-boys-blazer-01' AND ug.code IN ('PRIMARY_BOYS','SECONDARY_BOYS'))
      OR (pr.slug='narayana-cbse-uniform-grils-coat-01' AND ug.code IN ('PRIMARY_GIRLS','SECONDARY_GIRLS'))
      OR (pr.slug IN ('narayana-cbse-socks-3-sets-drak-grey-colour-01','narayana-socks-3-sets-01') AND ug.code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS','SECONDARY_BOYS','SECONDARY_GIRLS'))
      OR (pr.slug LIKE 'uniform-sports-t-shirt-%' AND ug.code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS','SECONDARY_BOYS','SECONDARY_GIRLS'))
      OR (pr.slug LIKE 'uniform-sports-pant-%' AND ug.code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS','SECONDARY_BOYS','SECONDARY_GIRLS'))
    WHERE ug.school_id=school_id AND pr.status='active'
  LOOP
    INSERT INTO public.variant_group_assignments(variant_id,group_id)
    SELECT v.id,g
    FROM public.product_variants v
    WHERE v.product_id=p AND v.status='active'
      AND (
        -- Explicit LKG/UKG sizes.
        (p=(SELECT id FROM products WHERE slug='narayana-cbse-uniform-frock-lkg-ukg-01') AND g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='EARLY_YEARS_GIRLS'))
        OR
        -- Age/size bands for generic numbered garments.
        (p IN (SELECT id FROM products WHERE slug IN ('narayana-cbse-uniform-boys-half-hands-shirt-01','narayana-cbse-uniform-shorts-01'))
          AND ((g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='EARLY_YEARS_BOYS') AND v.size_label IN ('4','6','8','10','11','12','13','14'))
            OR (g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='PRIMARY_BOYS') AND v.size_label IN ('12','14','16','18'))))
        OR
        (p=(SELECT id FROM products WHERE slug='narayana-cbse-uniform-girls-shirt-01')
          AND ((g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='EARLY_YEARS_GIRLS') AND v.size_label IN ('4','6','8','10'))
            OR (g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='PRIMARY_GIRLS') AND v.size_label IN ('10','12','14'))
            OR (g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='SECONDARY_GIRLS') AND v.size_label IN ('16','18'))))
        OR
        (p=(SELECT id FROM products WHERE slug='narayana-cbse-uniform-boys-girls-full-hands-shirt-01')
          AND ((v.size_label IN ('4','6','8','10','12','14','16','18') AND g IN (SELECT id FROM uniform_groups WHERE school_id=school_id AND code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS')))
            OR (v.size_label IN ('34','36','38','40','42','44','46') AND g IN (SELECT id FROM uniform_groups WHERE school_id=school_id AND code IN ('SECONDARY_BOYS','SECONDARY_GIRLS')))))
        OR
        (p=(SELECT id FROM products WHERE slug='narayana-cbse-uniform-boys-elastic-pant-back-elastic-01')
          AND ((g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='PRIMARY_BOYS') AND v.size_label IN ('32','34','36'))
            OR (g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='SECONDARY_BOYS') AND v.size_label IN ('38','40','42'))))
        OR
        (p=(SELECT id FROM products WHERE slug='narayana-cbse-uniform-gents-pant-fix-waist-01')
          AND ((g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='PRIMARY_BOYS') AND v.size_label IN ('26','28','30','32','34'))
            OR (g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='SECONDARY_BOYS') AND v.size_label IN ('36','38','40','42'))))
        OR
        (p=(SELECT id FROM products WHERE slug='narayana-cbse-uniform-divider-skirt-01')
          AND ((g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='PRIMARY_GIRLS') AND v.size_label IN ('24','25','26','27','28','32'))
            OR (g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='SECONDARY_GIRLS') AND v.size_label IN ('34','36'))))
        OR
        (p=(SELECT id FROM products WHERE slug='narayana-cbse-uniform-flit-normal-skirt-01')
          AND ((g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='PRIMARY_GIRLS') AND v.size_label IN ('23','26','29','32','34'))
            OR (g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='SECONDARY_GIRLS') AND v.size_label IN ('37','40'))))
        OR
        (p=(SELECT id FROM products WHERE slug='narayana-cbse-uniform-chudi-set-01') AND g=(SELECT id FROM uniform_groups WHERE school_id=school_id AND code='SECONDARY_GIRLS'))
        OR
        (p=(SELECT id FROM products WHERE slug='narayana-cbse-uniform-boys-blazer-01') AND g IN (SELECT id FROM uniform_groups WHERE school_id=school_id AND code IN ('PRIMARY_BOYS','SECONDARY_BOYS')))
        OR
        (p=(SELECT id FROM products WHERE slug='narayana-cbse-uniform-grils-coat-01') AND g IN (SELECT id FROM uniform_groups WHERE school_id=school_id AND code IN ('PRIMARY_GIRLS','SECONDARY_GIRLS')))
        OR
        (p=(SELECT id FROM products WHERE slug='narayana-cbse-uniform-binoform-01') AND g IN (SELECT id FROM uniform_groups WHERE school_id=school_id AND code IN ('EARLY_YEARS_BOYS','EARLY_YEARS_GIRLS','PRIMARY_BOYS','PRIMARY_GIRLS')))
        OR
        (p IN (SELECT id FROM products WHERE slug IN ('narayana-cbse-socks-3-sets-drak-grey-colour-01','narayana-socks-3-sets-01')) AND g IN (SELECT id FROM uniform_groups WHERE school_id=school_id))
        OR
        (p IN (SELECT id FROM products WHERE slug LIKE 'uniform-sports-t-shirt-%' OR slug LIKE 'uniform-sports-pant-%') AND g IN (SELECT id FROM uniform_groups WHERE school_id=school_id))
      )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

COMMIT;
