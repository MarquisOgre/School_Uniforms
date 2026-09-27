-- Source: FirstDay Uniform Narayana School product
-- Parent product: NARAYANA CBSE UNIFORM BOYS & GIRLS FULL HANDS SHIRT
-- Source product id: -O_QhrVWkh1BPX5clPip
-- Exact source size/price matrix:
-- 4 = unavailable / no price
-- 6 = unavailable / no price
-- 8 = unavailable / ₹500
-- 10 = unavailable / ₹500
-- 12 = unavailable / ₹550
-- 14 = active / ₹550
-- 16 = active / ₹600
-- 18 = unavailable / ₹600
-- 34 = active / ₹690
-- 36 = active / ₹690
-- 38 = active / ₹740
-- 40 = active / ₹740
-- 42 = active / ₹790
-- 44 = active / ₹790
-- 46 = unavailable / ₹790

UPDATE product_variants pv
SET
  price = CASE pv.size_label
    WHEN '4' THEN NULL
    WHEN '6' THEN NULL
    WHEN '8' THEN 500.00
    WHEN '10' THEN 500.00
    WHEN '12' THEN 550.00
    WHEN '14' THEN 550.00
    WHEN '16' THEN 600.00
    WHEN '18' THEN 600.00
    WHEN '34' THEN 690.00
    WHEN '36' THEN 690.00
    WHEN '38' THEN 740.00
    WHEN '40' THEN 740.00
    WHEN '42' THEN 790.00
    WHEN '44' THEN 790.00
    WHEN '46' THEN 790.00
  END,
  status = (
    CASE
      WHEN pv.size_label IN ('14','16','34','36','38','40','42','44') THEN 'active'
      ELSE 'inactive'
    END
  )::record_status,
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
