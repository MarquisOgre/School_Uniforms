-- Narayana Schools / CBSE catalogue
-- Source: FirstDay Uniform — Narayana School catalogue
-- Re-runnable: stable product slugs and variant SKUs; branch stock resets to 50.

BEGIN;

CREATE TEMP TABLE _narayana_catalogue (
  product_no integer PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  price numeric NOT NULL,
  gender gender_type NOT NULL,
  image_url text NOT NULL,
  sizes jsonb NOT NULL
) ON COMMIT DROP;

INSERT INTO _narayana_catalogue (product_no,name,slug,price,gender,image_url,sizes)
VALUES
(1,'UNIFORM SPORTS T SHIRT','uniform-sports-t-shirt-01',540,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwITb55myxfG7cU.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(2,'UNIFORM SPORTS T SHIRT','uniform-sports-t-shirt-02',540,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwJWfHsa0YWNY5x.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(3,'UNIFORM SPORTS T SHIRT','uniform-sports-t-shirt-03',540,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwJWfHsa0YWNY5y.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(4,'UNIFORM SPORTS T SHIRT','uniform-sports-t-shirt-04',540,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwJWfHsa0YWNY5z.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(5,'UNIFORM SPORTS T SHIRT','uniform-sports-t-shirt-05',480,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGf.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(6,'UNIFORM SPORTS PANT','uniform-sports-pant-01',400,'boys','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGe.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(7,'UNIFORM SPORTS T SHIRT','uniform-sports-t-shirt-06',480,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGh.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(8,'UNIFORM SPORTS PANT','uniform-sports-pant-02',400,'boys','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGg.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(9,'UNIFORM SPORTS T SHIRT','uniform-sports-t-shirt-07',480,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGj.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(10,'UNIFORM SPORTS PANT','uniform-sports-pant-03',390,'boys','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGi.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(11,'UNIFORM SPORTS PANT','uniform-sports-pant-04',400,'boys','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKlUZAyYlxapZZ8.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(12,'UNIFORM SPORTS T SHIRT','uniform-sports-t-shirt-08',480,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGd.jpg','["24","26","28","30","32","34","36","38","40","42","44"]'::jsonb),
(13,'NARAYANA CBSE SOCKS 3 SETS DRAK GREY COLOUR','narayana-cbse-socks-3-sets-drak-grey-colour-01',300,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oze8s4849okjkuUye5m.jpg','["2","3","4","5","6"]'::jsonb),
(14,'NARAYANA SOCKS 3 SETS','narayana-socks-3-sets-01',300,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P-ZaYxnkyMO__mUHv19.jpg','["2","3","4","5","6"]'::jsonb),
(15,'NARAYANA CBSE UNIFORM GIRLS SHIRT','narayana-cbse-uniform-girls-shirt-01',410,'girls','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRXCPnQau9AzrqSCwY.jpg','["4","6","8","10","12","14","16","18"]'::jsonb),
(16,'NARAYANA CBSE UNIFORM BOYS & GIRLS FULL HANDS SHIRT','narayana-cbse-uniform-boys-girls-full-hands-shirt-01',450,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRX4d24lG-s-jsQATj.jpg','["4","6","8","10","12","14","16","18","34","36","38","40","42","44","46"]'::jsonb),
(17,'NARAYANA CBSE UNIFORM CHUDI SET','narayana-cbse-uniform-chudi-set-01',980,'girls','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9Rte4JfFbeueIK7w3.jpg','["34","36","38","40","42","44","46"]'::jsonb),
(18,'NARAYANA CBSE UNIFORM BOYS HALF HANDS SHIRT','narayana-cbse-uniform-boys-half-hands-shirt-01',420,'boys','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRWtwBOtq7HTLbp4RX.jpg','["4","6","8","10","12","14","16","18"]'::jsonb),
(19,'NARAYANA CBSE UNIFORM FROCK  LKG-UKG','narayana-cbse-uniform-frock-lkg-ukg-01',650,'girls','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OrEUn3gVgybEOsVnGKX.jpg','["20","22","25","28","31","34"]'::jsonb),
(20,'NARAYANA CBSE UNIFORM BOYS BLAZER','narayana-cbse-uniform-boys-blazer-01',1900,'boys','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaA5z2ikrr90JibfFhy.jpg','["28","30","32","34","36","38","40","42","44"]'::jsonb),
(21,'NARAYANA CBSE UNIFORM FLIT NORMAL SKIRT','narayana-cbse-uniform-flit-normal-skirt-01',590,'girls','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRfCx-6uU5HC1FwXw3.jpg','["23","26","29","32","34","37","40"]'::jsonb),
(22,'NARAYANA CBSE UNIFORM GENTS PANT (FIX WAIST)','narayana-cbse-uniform-gents-pant-fix-waist-01',660,'boys','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9S7S4UZY8VqwOWczr.jpg','["26","28","30","32","34","36","38","40","42"]'::jsonb),
(23,'NARAYANA CBSE UNIFORM BOYS ELASTIC PANT (BACK ELASTIC)','narayana-cbse-uniform-boys-elastic-pant-back-elastic-01',550,'boys','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaPRBRPWPfoReKpzyfV.jpg','["32","34","36","38","40","42"]'::jsonb),
(24,'NARAYANA CBSE UNIFORM SHORTS','narayana-cbse-uniform-shorts-01',300,'boys','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9S0q9XHMSD2TcoUF4.jpg','["11","12","13","14","16","18"]'::jsonb),
(25,'NARAYANA CBSE UNIFORM BINOFORM','narayana-cbse-uniform-binoform-01',630,'unisex','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9SWT0yGyAVHgH4I4g.jpg','["20","22","25","28","31","34","37","40"]'::jsonb),
(26,'NARAYANA CBSE UNIFORM DIVIDER SKIRT','narayana-cbse-uniform-divider-skirt-01',530,'girls','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaPR0dwfEK0ZX1sVz59.jpg','["24","25","26","27","28","32","34","36"]'::jsonb),
(27,'NARAYANA CBSE UNIFORM GRILS COAT','narayana-cbse-uniform-grils-coat-01',560,'girls','https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaPQvW-WD7JMUrTuZb8.jpg','["8","10","12","14","16","18","20","22"]'::jsonb);

INSERT INTO schools (name, code, status)
VALUES ('Narayana Schools', 'NARAYANA', 'active'::record_status)
ON CONFLICT (code) DO NOTHING;

INSERT INTO branches (school_id, name, code, status)
SELECT id, 'CBSE', 'CBSE', 'active'::record_status
FROM schools
WHERE code='NARAYANA'
ON CONFLICT (school_id, code) DO NOTHING;

INSERT INTO products
(name,slug,description,gender,image_url,base_price,status,discount_percentage,offer_price,brand,image_gallery)
SELECT name,slug,'Imported from FirstDay Uniform — Narayana School catalogue',
       gender,image_url,price,'active'::record_status,0,price,
       'FirstDay Uniform',jsonb_build_array(image_url)
FROM _narayana_catalogue
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name,
  description=EXCLUDED.description,
  gender=EXCLUDED.gender,
  image_url=EXCLUDED.image_url,
  base_price=EXCLUDED.base_price,
  status=EXCLUDED.status,
  discount_percentage=EXCLUDED.discount_percentage,
  offer_price=EXCLUDED.offer_price,
  brand=EXCLUDED.brand,
  image_gallery=EXCLUDED.image_gallery,
  updated_at=now();

INSERT INTO product_variants
(product_id,sku,size_label,variant_name,price,status)
SELECT p.id,
       'NARAYANA-' || lpad(c.product_no::text,2,'0') || '-' || z.size,
       z.size,
       c.name || ' - Size ' || z.size,
       c.price,
       'active'::record_status
FROM _narayana_catalogue c
JOIN products p ON p.slug=c.slug
CROSS JOIN LATERAL jsonb_array_elements_text(c.sizes) z(size)
ON CONFLICT (sku) DO UPDATE SET
  product_id=EXCLUDED.product_id,
  size_label=EXCLUDED.size_label,
  variant_name=EXCLUDED.variant_name,
  price=EXCLUDED.price,
  status=EXCLUDED.status,
  updated_at=now();

INSERT INTO branch_products
(branch_id,product_id,branch_price,is_visible)
SELECT b.id,p.id,COALESCE(p.offer_price,p.base_price),true
FROM branches b
JOIN schools s ON s.id=b.school_id
JOIN _narayana_catalogue c ON true
JOIN products p ON p.slug=c.slug
WHERE s.code='NARAYANA' AND b.code='CBSE'
ON CONFLICT (branch_id,product_id) DO UPDATE SET
  branch_price=EXCLUDED.branch_price,
  is_visible=true,
  updated_at=now();

INSERT INTO branch_inventory
(branch_id,product_id,variant_id,quantity_on_hand,reorder_level)
SELECT b.id,v.product_id,v.id,50,0
FROM branches b
JOIN schools s ON s.id=b.school_id
JOIN product_variants v ON true
JOIN products p ON p.id=v.product_id
JOIN _narayana_catalogue c ON c.slug=p.slug
WHERE s.code='NARAYANA' AND b.code='CBSE'
ON CONFLICT (branch_id,variant_id) DO UPDATE SET
  product_id=EXCLUDED.product_id,
  quantity_on_hand=50,
  reorder_level=0,
  updated_at=now();

COMMIT;
