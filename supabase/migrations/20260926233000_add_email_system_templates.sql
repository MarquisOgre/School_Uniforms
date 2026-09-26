create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  description text,
  subject text not null,
  html_body text not null,
  text_body text,
  variables jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_templates enable row level security;

drop policy if exists email_templates_admin_read on public.email_templates;
drop policy if exists email_templates_admin_manage on public.email_templates;

create policy email_templates_admin_read on public.email_templates
for select using ((select app_private.current_user_role())::text in ('admin','super_admin'));

create policy email_templates_admin_manage on public.email_templates
for all using ((select app_private.current_user_role())::text in ('admin','super_admin'))
with check ((select app_private.current_user_role())::text in ('admin','super_admin'));

create index if not exists idx_email_templates_key on public.email_templates(template_key);
create index if not exists idx_email_templates_enabled on public.email_templates(enabled);

insert into public.email_templates (template_key,name,description,subject,html_body,text_body,variables)
values
('new_account','New Account / Welcome','Sent when a parent account is created.','Welcome to {{site_name}} — your account is ready','<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px"><h1>{{site_name}}</h1><h2>Welcome, {{customer_name}}!</h2><p>Your account has been created successfully.</p><p>You can now sign in and manage your student uniform orders.</p><p><a href="{{login_url}}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Sign In</a></p></div>','Welcome, {{customer_name}}! Your {{site_name}} account is ready. Sign in: {{login_url}}','["site_name","customer_name","login_url"]'::jsonb),
('password_reset','Password Reset','Sent when a password reset is requested.','Reset your {{site_name}} password','<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px"><h1>{{site_name}}</h1><h2>Password reset requested</h2><p>Hello {{customer_name}},</p><p>Use the button below to reset your password.</p><p><a href="{{reset_url}}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a></p></div>','Hello {{customer_name}}, reset your password here: {{reset_url}}','["site_name","customer_name","reset_url"]'::jsonb),
('order_received','New Order','Sent after an order is successfully placed.','Order {{order_number}} received — {{site_name}}','<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px"><h1>{{site_name}}</h1><h2>Thank you for your order!</h2><p>Hello {{customer_name}}, we received order <strong>#{{order_number}}</strong>.</p><p>Order total: <strong>{{order_total}}</strong></p><p><a href="{{order_url}}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">View Order</a></p></div>','Thank you, {{customer_name}}. We received order #{{order_number}} for {{order_total}}. View it: {{order_url}}','["site_name","customer_name","order_number","order_total","order_url"]'::jsonb),
('order_processing','Order Processing','Sent when payment/order processing begins.','Your order {{order_number}} is being processed','<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px"><h1>{{site_name}}</h1><h2>Order is being processed</h2><p>Hello {{customer_name}}, your order <strong>#{{order_number}}</strong> is now being processed.</p><p><a href="{{order_url}}">View order details</a></p></div>','Hello {{customer_name}}, order #{{order_number}} is being processed. {{order_url}}','["site_name","customer_name","order_number","order_url"]'::jsonb),
('order_completed','Order Completed','Sent when an order is completed.','Order {{order_number}} completed','<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px"><h1>{{site_name}}</h1><h2>Your order is complete</h2><p>Hello {{customer_name}}, order <strong>#{{order_number}}</strong> has been completed.</p><p>Thank you for shopping with us.</p><p><a href="{{order_url}}">View order</a></p></div>','Hello {{customer_name}}, order #{{order_number}} is complete. Thank you for shopping with us.','["site_name","customer_name","order_number","order_url"]'::jsonb),
('order_cancelled','Order Cancelled','Sent when an order is cancelled.','Order {{order_number}} cancelled','<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px"><h1>{{site_name}}</h1><h2>Order cancelled</h2><p>Hello {{customer_name}}, order <strong>#{{order_number}}</strong> has been cancelled.</p><p><a href="{{order_url}}">View order details</a></p></div>','Hello {{customer_name}}, order #{{order_number}} has been cancelled.','["site_name","customer_name","order_number","order_url"]'::jsonb),
('payment_failed','Payment Failed','Sent when an online payment fails.','Payment failed for order {{order_number}}','<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px"><h1>{{site_name}}</h1><h2>Payment failed</h2><p>Hello {{customer_name}}, the payment for order <strong>#{{order_number}}</strong> could not be completed.</p><p>Please try again or choose another payment method.</p><p><a href="{{order_url}}">Retry payment</a></p></div>','Hello {{customer_name}}, payment for order #{{order_number}} failed. Retry: {{order_url}}','["site_name","customer_name","order_number","order_url"]'::jsonb),
('refund_processed','Refund Processed','Sent when a refund is processed.','Refund processed for order {{order_number}}','<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px"><h1>{{site_name}}</h1><h2>Refund processed</h2><p>Hello {{customer_name}}, your refund for order <strong>#{{order_number}}</strong> has been processed.</p><p>Refund amount: <strong>{{refund_amount}}</strong></p></div>','Hello {{customer_name}}, your refund for order #{{order_number}} has been processed for {{refund_amount}}.','["site_name","customer_name","order_number","refund_amount"]'::jsonb)
on conflict (template_key) do nothing;