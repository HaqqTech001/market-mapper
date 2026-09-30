-- Private field media bucket. Client access is authenticated and object ownership is enforced by path prefix.
insert into storage.buckets (id, name, public)
values ('field-media','field-media',false)
on conflict (id) do update set public=false;

create policy "field users upload own media"
on storage.objects for insert to authenticated
with check (bucket_id='field-media' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "field users read own media"
on storage.objects for select to authenticated
using (bucket_id='field-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

create policy "field users update own media"
on storage.objects for update to authenticated
using (bucket_id='field-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()))
with check (bucket_id='field-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

create policy "field users delete own media"
on storage.objects for delete to authenticated
using (bucket_id='field-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
