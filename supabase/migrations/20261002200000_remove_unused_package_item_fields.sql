-- Remove package item fields that are no longer part of the Uniform Package model.
-- Package items now use only quantity, requires_size, and variant_ids for item configuration.

alter table public.package_items
  drop column if exists is_required,
  drop column if exists selection_group,
  drop column if exists sort_order;
