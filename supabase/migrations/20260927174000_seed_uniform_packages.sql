-- Seed useful uniform packages from existing individual products.
-- Packages are visible to every active branch.

with package_data(slug,name,description,gender) as (
  values
    ('boys-daily-uniform-package','Boys Daily Uniform Package','Complete everyday boys uniform: shirt, elastic-fit pant and 3-pair socks.','boys'::gender_type),
    ('girls-daily-uniform-package','Girls Daily Uniform Package','Complete everyday girls uniform: shirt, divider skirt and 3-pair socks.','girls'::gender_type),
    ('lkg-ukg-uniform-package','LKG-UKG Uniform Package','Essential LKG-UKG uniform: frock and 3-pair socks.','girls'::gender_type),
    ('boys-winter-uniform-package','Boys Winter Uniform Package','Boys regular uniform with blazer for cooler-weather school days.','boys'::gender_type),
    ('girls-winter-uniform-package','Girls Winter Uniform Package','Girls regular uniform with coat for cooler-weather school days.','girls'::gender_type),
    ('sports-activity-package','Sports & Activity Package','Sports day essentials: sports T-shirt and sports pant.','unisex'::gender_type)
)
insert into public.uniform_packages (name,slug,description,gender,base_price,offer_price,discount_percentage,status)
select name,slug,description,gender,0,0,0,'active'::record_status
from package_data
on conflict (slug) do update set
  name=excluded.name,
  description=excluded.description,
  gender=excluded.gender,
  status='active'::record_status,
  updated_at=now();

delete from public.package_items
where package_id in (
  select id from public.uniform_packages
  where slug in (
    'boys-daily-uniform-package','girls-daily-uniform-package','lkg-ukg-uniform-package',
    'boys-winter-uniform-package','girls-winter-uniform-package','sports-activity-package'
  )
);

with package_products(package_slug, product_slug, quantity, sort_order) as (
  values
    ('boys-daily-uniform-package','narayana-cbse-uniform-boys-half-hands-shirt-01',1,1),
    ('boys-daily-uniform-package','narayana-cbse-uniform-boys-elastic-pant-back-elastic-01',1,2),
    ('boys-daily-uniform-package','narayana-cbse-socks-3-sets-drak-grey-colour-01',1,3),
    ('girls-daily-uniform-package','narayana-cbse-uniform-girls-shirt-01',1,1),
    ('girls-daily-uniform-package','narayana-cbse-uniform-divider-skirt-01',1,2),
    ('girls-daily-uniform-package','narayana-cbse-socks-3-sets-drak-grey-colour-01',1,3),
    ('lkg-ukg-uniform-package','narayana-cbse-uniform-frock-lkg-ukg-01',1,1),
    ('lkg-ukg-uniform-package','narayana-cbse-socks-3-sets-drak-grey-colour-01',1,2),
    ('boys-winter-uniform-package','narayana-cbse-uniform-boys-half-hands-shirt-01',1,1),
    ('boys-winter-uniform-package','narayana-cbse-uniform-boys-elastic-pant-back-elastic-01',1,2),
    ('boys-winter-uniform-package','narayana-cbse-uniform-boys-blazer-01',1,3),
    ('boys-winter-uniform-package','narayana-cbse-socks-3-sets-drak-grey-colour-01',1,4),
    ('girls-winter-uniform-package','narayana-cbse-uniform-girls-shirt-01',1,1),
    ('girls-winter-uniform-package','narayana-cbse-uniform-divider-skirt-01',1,2),
    ('girls-winter-uniform-package','narayana-cbse-uniform-grils-coat-01',1,3),
    ('girls-winter-uniform-package','narayana-cbse-socks-3-sets-drak-grey-colour-01',1,4),
    ('sports-activity-package','uniform-sports-t-shirt-07',1,1),
    ('sports-activity-package','uniform-sports-pant-03',1,2)
)
insert into public.package_items
  (package_id,product_id,quantity,is_required,requires_size,selection_group,sort_order,variant_ids)
select
  pkg.id,
  prod.id,
  pp.quantity,
  true,
  true,
  null,
  pp.sort_order,
  coalesce(array(select v.id from public.product_variants v where v.product_id=prod.id and v.status='active'), '{}'::uuid[])
from package_products pp
join public.uniform_packages pkg on pkg.slug=pp.package_slug
join public.products prod on prod.slug=pp.product_slug;

update public.uniform_packages p
set
  base_price = totals.base_price,
  offer_price = totals.base_price,
  discount_percentage = 0,
  updated_at = now()
from (
  select pi.package_id, sum(prod.base_price * pi.quantity) as base_price
  from public.package_items pi
  join public.products prod on prod.id=pi.product_id
  group by pi.package_id
) totals
where p.id=totals.package_id;

insert into public.branch_packages (branch_id,package_id,branch_price,is_visible)
select b.id,p.id,p.base_price,true
from public.branches b
cross join public.uniform_packages p
where b.status='active'
  and p.slug in (
    'boys-daily-uniform-package','girls-daily-uniform-package','lkg-ukg-uniform-package',
    'boys-winter-uniform-package','girls-winter-uniform-package','sports-activity-package'
  )
on conflict (branch_id,package_id) do update set
  branch_price=excluded.branch_price,
  is_visible=true,
  updated_at=now();
