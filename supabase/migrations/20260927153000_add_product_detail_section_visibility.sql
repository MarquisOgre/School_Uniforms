-- Per-product visibility controls for the five product-detail sections.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS show_cod_returns_shipping boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_details boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_description boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_quality_care boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_delivery_returns boolean NOT NULL DEFAULT true;

UPDATE products
SET
  show_cod_returns_shipping = COALESCE(show_cod_returns_shipping, true),
  show_details = COALESCE(show_details, true),
  show_description = COALESCE(show_description, true),
  show_quality_care = COALESCE(show_quality_care, true),
  show_delivery_returns = COALESCE(show_delivery_returns, true);