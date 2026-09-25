-- Expand the order lifecycle used by the Admin order/payment workflow.
-- Payment status remains a separate payment_status enum.
alter type public.order_status add value if not exists 'packed' after 'ready';
alter type public.order_status add value if not exists 'out_for_delivery' after 'shipped';
alter type public.order_status add value if not exists 'return_requested' after 'cancelled';
alter type public.order_status add value if not exists 'return_approved' after 'return_requested';
alter type public.order_status add value if not exists 'returned' after 'return_approved';
alter type public.order_status add value if not exists 'refund_processing' after 'returned';
