-- Findings from Supabase's security advisor on the live project.
--  * set_updated_at had a mutable search_path.
--  * handle_new_user is a signup trigger; it should not be callable through the REST API.
-- (public_experts is intentionally a security-definer view exposing safe columns only, and
--  get_expert_busy_ranges is intentionally callable by signed-in users for booking.)
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
