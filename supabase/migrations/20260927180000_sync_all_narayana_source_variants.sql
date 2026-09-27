-- Sync all Narayana School product variants to the exact FirstDay Uniform source catalogue.
-- Source: NARAYANA SCHOOL catalogue HTML captured from firstdayuniform.com.
-- Matching uses the source product image URL because several catalogue products share the same name.
-- N = source variant has no size-specific price; A/I = source available/unavailable.

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '28' THEN NULL
  WHEN '30' THEN NULL
  WHEN '32' THEN NULL
  WHEN '34' THEN 2000.00
  WHEN '36' THEN 2000.00
  WHEN '38' THEN 2100.00
  WHEN '40' THEN 2100.00
  WHEN '42' THEN 2200.00
  WHEN '44' THEN 2200.00
END,
status = CASE WHEN pv.size_label IN ('28','30','32','40','42') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaA5z2ikrr90JibfFhy.jpg';

UPDATE products SET base_price=1900.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaA5z2ikrr90JibfFhy.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '23' THEN NULL
  WHEN '26' THEN NULL
  WHEN '29' THEN 640.00
  WHEN '32' THEN 640.00
  WHEN '34' THEN 690.00
  WHEN '37' THEN 690.00
  WHEN '40' THEN 740.00
END,
status = CASE WHEN pv.size_label IN ('23','26','32','34','37','40') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRfCx-6uU5HC1FwXw3.jpg';

UPDATE products SET base_price=590.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRfCx-6uU5HC1FwXw3.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '34' THEN 980.00
  WHEN '36' THEN 980.00
  WHEN '38' THEN 1030.00
  WHEN '40' THEN 1030.00
  WHEN '42' THEN 1080.00
  WHEN '44' THEN 1080.00
  WHEN '46' THEN 1130.00
END,
status = CASE WHEN pv.size_label IN ('34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9Rte4JfFbeueIK7w3.jpg';

UPDATE products SET base_price=980.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9Rte4JfFbeueIK7w3.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '11' THEN NULL
  WHEN '12' THEN NULL
  WHEN '13' THEN 330.00
  WHEN '14' THEN 330.00
  WHEN '16' THEN 350.00
  WHEN '18' THEN 350.00
END,
status = CASE WHEN pv.size_label IN ('12','13','14','16','18') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9S0q9XHMSD2TcoUF4.jpg';

UPDATE products SET base_price=300.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9S0q9XHMSD2TcoUF4.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '32' THEN NULL
  WHEN '34' THEN NULL
  WHEN '36' THEN 590.00
  WHEN '38' THEN 590.00
  WHEN '40' THEN 610.00
  WHEN '42' THEN 610.00
END,
status = CASE WHEN pv.size_label IN ('36','38') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaPRBRPWPfoReKpzyfV.jpg';

UPDATE products SET base_price=550.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaPRBRPWPfoReKpzyfV.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '26' THEN NULL
  WHEN '28' THEN NULL
  WHEN '30' THEN NULL
  WHEN '32' THEN NULL
  WHEN '34' THEN 710.00
  WHEN '36' THEN 710.00
  WHEN '38' THEN 710.00
  WHEN '40' THEN 710.00
  WHEN '42' THEN 760.00
END,
status = CASE WHEN pv.size_label IN ('42') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9S7S4UZY8VqwOWczr.jpg';

UPDATE products SET base_price=660.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9S7S4UZY8VqwOWczr.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '8' THEN NULL
  WHEN '10' THEN NULL
  WHEN '12' THEN 610.00
  WHEN '14' THEN 610.00
  WHEN '16' THEN 660.00
  WHEN '18' THEN 660.00
  WHEN '20' THEN 660.00
  WHEN '22' THEN 660.00
END,
status = CASE WHEN pv.size_label IN ('8','10','12','14','16','18','20','22') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaPQvW-WD7JMUrTuZb8.jpg';

UPDATE products SET base_price=560.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaPQvW-WD7JMUrTuZb8.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '20' THEN NULL
  WHEN '22' THEN NULL
  WHEN '25' THEN 700.00
  WHEN '28' THEN 700.00
  WHEN '31' THEN 750.00
  WHEN '34' THEN 750.00
END,
status = CASE WHEN pv.size_label IN ('20','22','25','28','31','34') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OrEUn3gVgybEOsVnGKX.jpg';

UPDATE products SET base_price=650.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OrEUn3gVgybEOsVnGKX.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '25' THEN 550.00
  WHEN '26' THEN 550.00
  WHEN '27' THEN 600.00
  WHEN '28' THEN 600.00
  WHEN '32' THEN 650.00
  WHEN '34' THEN 650.00
  WHEN '36' THEN 700.00
END,
status = CASE WHEN pv.size_label IN ('24','25','26','27','28','32','34','36') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaPR0dwfEK0ZX1sVz59.jpg';

UPDATE products SET base_price=530.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OaPR0dwfEK0ZX1sVz59.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '4' THEN NULL
  WHEN '6' THEN NULL
  WHEN '8' THEN 450.00
  WHEN '10' THEN 450.00
  WHEN '12' THEN 500.00
  WHEN '14' THEN 500.00
  WHEN '16' THEN 550.00
  WHEN '18' THEN 550.00
END,
status = CASE WHEN pv.size_label IN ('4','6','8','10','12','14','16') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRWtwBOtq7HTLbp4RX.jpg';

UPDATE products SET base_price=420.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRWtwBOtq7HTLbp4RX.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '20' THEN NULL
  WHEN '22' THEN NULL
  WHEN '25' THEN 700.00
  WHEN '28' THEN 700.00
  WHEN '31' THEN 750.00
  WHEN '34' THEN 750.00
  WHEN '37' THEN 850.00
  WHEN '40' THEN 850.00
END,
status = CASE WHEN pv.size_label IN ('20','22','25','28','31','34','37','40') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9SWT0yGyAVHgH4I4g.jpg';

UPDATE products SET base_price=630.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oa9SWT0yGyAVHgH4I4g.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
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
status = CASE WHEN pv.size_label IN ('14','16','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRX4d24lG-s-jsQATj.jpg';

UPDATE products SET base_price=450.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRX4d24lG-s-jsQATj.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '4' THEN NULL
  WHEN '6' THEN NULL
  WHEN '8' THEN 450.00
  WHEN '10' THEN 450.00
  WHEN '12' THEN 500.00
  WHEN '14' THEN 500.00
  WHEN '16' THEN 550.00
  WHEN '18' THEN 550.00
END,
status = CASE WHEN pv.size_label IN ('4','6','8','10') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRXCPnQau9AzrqSCwY.jpg';

UPDATE products SET base_price=410.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-OpRXCPnQau9AzrqSCwY.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '26' THEN 440.00
  WHEN '28' THEN 480.00
  WHEN '30' THEN 520.00
  WHEN '32' THEN 520.00
  WHEN '34' THEN 560.00
  WHEN '36' THEN 560.00
  WHEN '38' THEN 600.00
  WHEN '40' THEN 600.00
  WHEN '42' THEN 640.00
  WHEN '44' THEN 640.00
END,
status = CASE WHEN pv.size_label IN ('24','26','28','30','32','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKlUZAyYlxapZZ8.jpg';

UPDATE products SET base_price=400.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKlUZAyYlxapZZ8.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '26' THEN NULL
  WHEN '28' THEN 520.00
  WHEN '30' THEN 560.00
  WHEN '32' THEN 560.00
  WHEN '34' THEN 580.00
  WHEN '36' THEN 580.00
  WHEN '38' THEN 640.00
  WHEN '40' THEN 640.00
  WHEN '42' THEN 680.00
  WHEN '44' THEN 680.00
END,
status = CASE WHEN pv.size_label IN ('24','26','30','32','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGd.jpg';

UPDATE products SET base_price=480.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGd.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '26' THEN 440.00
  WHEN '28' THEN 480.00
  WHEN '30' THEN 520.00
  WHEN '32' THEN 520.00
  WHEN '34' THEN 560.00
  WHEN '36' THEN 560.00
  WHEN '38' THEN 600.00
  WHEN '40' THEN 600.00
  WHEN '42' THEN 640.00
  WHEN '44' THEN 640.00
END,
status = CASE WHEN pv.size_label IN ('24','26','28','30','32','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGe.jpg';

UPDATE products SET base_price=400.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGe.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '26' THEN 480.00
  WHEN '28' THEN 520.00
  WHEN '30' THEN 560.00
  WHEN '32' THEN 560.00
  WHEN '34' THEN 580.00
  WHEN '36' THEN 580.00
  WHEN '38' THEN 640.00
  WHEN '40' THEN 640.00
  WHEN '42' THEN 680.00
  WHEN '44' THEN 680.00
END,
status = CASE WHEN pv.size_label IN ('24','26','28','30','32','34','36','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGf.jpg';

UPDATE products SET base_price=480.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGf.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '26' THEN 440.00
  WHEN '28' THEN 480.00
  WHEN '30' THEN 520.00
  WHEN '32' THEN 520.00
  WHEN '34' THEN 560.00
  WHEN '36' THEN 560.00
  WHEN '38' THEN 600.00
  WHEN '40' THEN 600.00
  WHEN '42' THEN 640.00
  WHEN '44' THEN 640.00
END,
status = CASE WHEN pv.size_label IN ('24','26','28','30','32','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGg.jpg';

UPDATE products SET base_price=400.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGg.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '26' THEN NULL
  WHEN '28' THEN 520.00
  WHEN '30' THEN 560.00
  WHEN '32' THEN 560.00
  WHEN '34' THEN 580.00
  WHEN '36' THEN 580.00
  WHEN '38' THEN 640.00
  WHEN '40' THEN 640.00
  WHEN '42' THEN 680.00
  WHEN '44' THEN 680.00
END,
status = CASE WHEN pv.size_label IN ('24','26','28','30','32','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGh.jpg';

UPDATE products SET base_price=480.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGh.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN 400.00
  WHEN '26' THEN 440.00
  WHEN '28' THEN 480.00
  WHEN '30' THEN 520.00
  WHEN '32' THEN 520.00
  WHEN '34' THEN 560.00
  WHEN '36' THEN 560.00
  WHEN '38' THEN 600.00
  WHEN '40' THEN 600.00
  WHEN '42' THEN 640.00
  WHEN '44' THEN 640.00
END,
status = CASE WHEN pv.size_label IN ('24','26','28','30','32','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGi.jpg';

UPDATE products SET base_price=390.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGi.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '26' THEN NULL
  WHEN '28' THEN 520.00
  WHEN '30' THEN 560.00
  WHEN '32' THEN 560.00
  WHEN '34' THEN 580.00
  WHEN '36' THEN 580.00
  WHEN '38' THEN 640.00
  WHEN '40' THEN 640.00
  WHEN '42' THEN 680.00
  WHEN '44' THEN 680.00
END,
status = CASE WHEN pv.size_label IN ('24','26','28','30','32','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGj.jpg';

UPDATE products SET base_price=480.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oy3JlKmFDrtM7uVWlGj.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '2' THEN NULL
  WHEN '3' THEN NULL
  WHEN '4' THEN NULL
  WHEN '5' THEN NULL
  WHEN '6' THEN NULL
END,
status = CASE WHEN pv.size_label IN ('2','3','4','5','6') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oze8s4849okjkuUye5m.jpg';

UPDATE products SET base_price=300.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-Oze8s4849okjkuUye5m.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '26' THEN NULL
  WHEN '28' THEN 590.00
  WHEN '30' THEN 590.00
  WHEN '32' THEN 640.00
  WHEN '34' THEN 640.00
  WHEN '36' THEN 690.00
  WHEN '38' THEN 690.00
  WHEN '40' THEN 740.00
  WHEN '42' THEN 740.00
  WHEN '44' THEN 790.00
END,
status = CASE WHEN pv.size_label IN ('24','26','28','30','32','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwITb55myxfG7cU.jpg';

UPDATE products SET base_price=540.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwITb55myxfG7cU.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '26' THEN NULL
  WHEN '28' THEN 590.00
  WHEN '30' THEN 590.00
  WHEN '32' THEN 640.00
  WHEN '34' THEN 640.00
  WHEN '36' THEN 690.00
  WHEN '38' THEN 690.00
  WHEN '40' THEN 740.00
  WHEN '42' THEN 740.00
  WHEN '44' THEN 790.00
END,
status = CASE WHEN pv.size_label IN ('24','26','28','30','32','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwJWfHsa0YWNY5x.jpg';

UPDATE products SET base_price=540.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwJWfHsa0YWNY5x.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '26' THEN NULL
  WHEN '28' THEN 590.00
  WHEN '30' THEN 590.00
  WHEN '32' THEN 640.00
  WHEN '34' THEN 640.00
  WHEN '36' THEN 690.00
  WHEN '38' THEN 690.00
  WHEN '40' THEN 740.00
  WHEN '42' THEN 740.00
  WHEN '44' THEN 790.00
END,
status = CASE WHEN pv.size_label IN ('24','26','28','30','32','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwJWfHsa0YWNY5y.jpg';

UPDATE products SET base_price=540.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwJWfHsa0YWNY5y.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '24' THEN NULL
  WHEN '26' THEN NULL
  WHEN '28' THEN 590.00
  WHEN '30' THEN 590.00
  WHEN '32' THEN 640.00
  WHEN '34' THEN 640.00
  WHEN '36' THEN 690.00
  WHEN '38' THEN 690.00
  WHEN '40' THEN 740.00
  WHEN '42' THEN 740.00
  WHEN '44' THEN 790.00
END,
status = CASE WHEN pv.size_label IN ('24','26','28','30','32','34','36','38','40','42','44') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwJWfHsa0YWNY5z.jpg';

UPDATE products SET base_price=540.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P27fWwJWfHsa0YWNY5z.jpg';

UPDATE product_variants pv
SET price = CASE pv.size_label
  WHEN '2' THEN NULL
  WHEN '3' THEN NULL
  WHEN '4' THEN NULL
  WHEN '5' THEN NULL
  WHEN '6' THEN NULL
END,
status = CASE WHEN pv.size_label IN ('2','3','4','5','6') THEN 'active'::record_status ELSE 'inactive'::record_status END,
updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id AND p.image_url = 'https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P-ZaYxnkyMO__mUHv19.jpg';

UPDATE products SET base_price=300.00,updated_at=NOW() WHERE image_url='https://cdn.quicksell.co/-OZd1qUKGr_jW2Hf7Dv8/products/-P-ZaYxnkyMO__mUHv19.jpg';

