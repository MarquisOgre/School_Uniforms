-- Ensure authenticated staff/customer requests can reach invoices through the Supabase Data API.
-- RLS policies remain the row-level authorization boundary.
grant select, insert, update, delete on table public.invoices to authenticated;
alter table public.invoices enable row level security;
