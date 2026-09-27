-- Allow atomic school/branch transfers where both the customer profile
-- and linked student scope change in the same transaction.
ALTER TABLE orders
  ALTER CONSTRAINT orders_customer_scope_fk DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE orders
  ALTER CONSTRAINT orders_student_scope_fk DEFERRABLE INITIALLY DEFERRED;