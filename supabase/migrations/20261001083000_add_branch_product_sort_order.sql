alter table public.branch_products add column if not exists sort_order integer not null default 0;

with ranked as (
  select branch_id, product_id,
         row_number() over (partition by branch_id order by created_at, product_id) - 1 as new_order
  from public.branch_products
)
update public.branch_products bp
set sort_order = ranked.new_order
from ranked
where bp.branch_id = ranked.branch_id and bp.product_id = ranked.product_id;
