-- Allow school/branch scope changes on a user profile to cascade to their orders.
-- This preserves historical orders while keeping the composite customer scope FK valid.

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_customer_scope_fk;

ALTER TABLE orders
  ADD CONSTRAINT orders_customer_scope_fk
  FOREIGN KEY (customer_user_id, school_id, branch_id)
  REFERENCES profiles(id, school_id, branch_id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;