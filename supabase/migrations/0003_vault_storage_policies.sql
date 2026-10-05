-- ============================================================================
-- Storage RLS for the private `vault` bucket.
--
-- Files are stored at `<session_id>/<timestamp>-<filename>`, so the first path
-- segment identifies the session. Access mirrors vault_files: only the client
-- and expert on that session may read or write.
--
-- Note: upsert requires INSERT + SELECT + UPDATE together (Supabase gotcha).
-- ============================================================================

begin;

drop policy if exists "Vault: participants can read"   on storage.objects;
drop policy if exists "Vault: participants can upload" on storage.objects;
drop policy if exists "Vault: participants can update" on storage.objects;
drop policy if exists "Vault: uploaders can delete"    on storage.objects;

create policy "Vault: participants can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vault'
    and private.is_session_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "Vault: participants can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vault'
    and owner = (select auth.uid())
    and private.is_session_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "Vault: participants can update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'vault'
    and private.is_session_participant(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'vault'
    and private.is_session_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "Vault: uploaders can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'vault' and owner = (select auth.uid()));

commit;
