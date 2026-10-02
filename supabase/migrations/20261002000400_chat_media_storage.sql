-- Chat attachment storage access for all authorized chat participants.
-- field-media remains private; object names are user-owned prefixes.
drop policy if exists "authenticated chat media read" on storage.objects;
create policy "authenticated chat media read" on storage.objects for select to authenticated
using (bucket_id='field-media' and public.current_user_is_active() and (storage.foldername(name))[2]='chat');

drop policy if exists "authenticated own chat media insert" on storage.objects;
create policy "authenticated own chat media insert" on storage.objects for insert to authenticated
with check (bucket_id='field-media' and public.current_user_is_active() and (storage.foldername(name))[1]=auth.uid()::text and (storage.foldername(name))[2]='chat');

drop policy if exists "authenticated own chat media update" on storage.objects;
create policy "authenticated own chat media update" on storage.objects for update to authenticated
using (bucket_id='field-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()))
with check (bucket_id='field-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

drop policy if exists "authenticated own chat media delete" on storage.objects;
create policy "authenticated own chat media delete" on storage.objects for delete to authenticated
using (bucket_id='field-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
