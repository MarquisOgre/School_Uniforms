-- Source-aligned variant catalogue for the Narayana CBSE full hands shirt.
-- Verified sizes from the supplied FirstDay Uniform catalogue:
-- 4, 6, 8, 10, 12, 14, 16, 18, 34, 36, 38, 40, 42, 44, 46.
-- Verified size-specific prices from the supplied source screenshots:
-- 14 = ₹550, 36 = ₹690, 38 = ₹740.
-- The supplied HTML catalogue exposes ₹450 as the product/base price; sizes without
-- a separately verified variant price therefore retain ₹450 rather than inventing a value.

UPDATE product_variants pv
SET
  price = CASE pv.size_label
    WHEN '14' THEN 550.00
    WHEN '36' THEN 690.00
    WHEN '38' THEN 740.00
    ELSE 450.00
  END,
  status = 'active',
  updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id
  AND p.name = 'NARAYANA CBSE UNIFORM BOYS & GIRLS FULL HANDS SHIRT'
  AND pv.size_label IN (
    '4','6','8','10','12','14','16','18',
    '34','36','38','40','42','44','46'
  );

UPDATE products
SET base_price = 450.00
WHERE name = 'NARAYANA CBSE UNIFORM BOYS & GIRLS FULL HANDS SHIRT';
