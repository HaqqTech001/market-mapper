-- WhatsApp-style delete attribution for shared tombstones.
alter table public.chat_messages add column if not exists deleted_by_id uuid references public.profiles(id) on delete set null;
alter table public.chat_messages add column if not exists deleted_by_name text;
create index if not exists idx_chat_messages_deleted_by on public.chat_messages(deleted_by_id) where deleted_at is not null;
