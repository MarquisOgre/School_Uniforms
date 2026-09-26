create or replace function public.touch_support_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_conversations
  set updated_at = pg_catalog.now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists support_message_touch_conversation on public.support_messages;
create trigger support_message_touch_conversation
after insert on public.support_messages
for each row execute function public.touch_support_conversation();

revoke execute on function public.touch_support_conversation() from public, anon, authenticated;
