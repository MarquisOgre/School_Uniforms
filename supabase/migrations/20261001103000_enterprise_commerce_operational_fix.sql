-- Make enterprise commerce modules operational for customers and administrators.
drop policy if exists shipping_zones_public on public.shipping_zones;
create policy shipping_zones_public on public.shipping_zones for select to anon,authenticated using(status='active');
drop policy if exists shipping_methods_public on public.shipping_methods;
create policy shipping_methods_public on public.shipping_methods for select to anon,authenticated using(enabled=true);
drop policy if exists fulfillments_customer_read on public.order_fulfillments;
create policy fulfillments_customer_read on public.order_fulfillments for select to authenticated using(exists(select 1 from public.orders o where o.id=order_fulfillments.order_id and o.customer_user_id=auth.uid()));
drop policy if exists returns_customer_insert on public.returns;
create policy returns_customer_insert on public.returns for insert to authenticated with check(customer_user_id=auth.uid());
drop policy if exists return_items_customer_insert on public.return_items;
create policy return_items_customer_insert on public.return_items for insert to authenticated with check(exists(select 1 from public.returns r where r.id=return_items.return_id and r.customer_user_id=auth.uid()));
create or replace function public.create_order_commerce_records() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.invoices(order_id,invoice_number,status,issued_at)
  values(new.id,'INV-'||upper(substr(replace(new.id::text,'-',''),1,12)),'issued',coalesce(new.created_at,now()))
  on conflict(order_id) do nothing;
  insert into public.order_fulfillments(order_id,branch_id,status)
  values(new.id,new.branch_id,'pending')
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists orders_create_commerce_records on public.orders;
create trigger orders_create_commerce_records after insert on public.orders for each row execute function public.create_order_commerce_records();
insert into public.invoices(order_id,invoice_number,status,issued_at)
select o.id,'INV-'||upper(substr(replace(o.id::text,'-',''),1,12)),'issued',coalesce(o.created_at,now())
from public.orders o where not exists(select 1 from public.invoices i where i.order_id=o.id);
insert into public.order_fulfillments(order_id,branch_id,status)
select o.id,o.branch_id,'pending' from public.orders o where not exists(select 1 from public.order_fulfillments f where f.order_id=o.id);
