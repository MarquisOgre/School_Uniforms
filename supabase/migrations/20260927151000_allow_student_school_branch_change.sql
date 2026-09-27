-- Allow a student's school/branch scope to change without invalidating orders.
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_student_scope_fk;

ALTER TABLE orders
  ADD CONSTRAINT orders_student_scope_fk
  FOREIGN KEY (student_id, school_id, branch_id)
  REFERENCES students(id, school_id, branch_id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;