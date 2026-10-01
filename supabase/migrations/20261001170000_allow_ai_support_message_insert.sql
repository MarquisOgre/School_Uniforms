-- Allow the AI assistant to persist its own response (sender_user_id IS NULL)
-- inside a conversation owned by the authenticated customer.
drop policy if exists support_messages_insert on public.support_messages;

create policy support_messages_insert
on public.support_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.support_conversations c
    where c.id = support_messages.conversation_id
      and (
        c.customer_user_id = (select auth.uid())
        or app_private.current_user_role() = any (
          array[
            'admin'::account_role,
            'school_manager'::account_role,
            'branch_manager'::account_role
          ]
        )
      )
  )
  and (
    sender_user_id = (select auth.uid())
    or sender_user_id is null
  )
);
