-- Allow each package item to define which product variants are available
-- to customers when selecting a size/variant for that package.

alter table public.package_items
  add column if not exists variant_ids uuid[] not null default '{}';

create index if not exists idx_package_items_variant_ids
  on public.package_items using gin (variant_ids);
