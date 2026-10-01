-- Public storefronts may read promotions, while RLS exposes only currently active scheduled rows.
grant select on table public.promotions to anon;
alter table public.promotions enable row level security;
