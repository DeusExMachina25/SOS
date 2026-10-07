-- ============================================================================
-- Public expert directory.
--
-- 0002 correctly restricted `profiles` to authenticated users so the public
-- site cannot scrape emails and phone numbers. That also means /platter — a
-- public marketing page — reads zero rows and silently falls back to hardcoded
-- placeholder experts.
--
-- This view is the "tighten to a public view later" path that 0002's own
-- comment anticipated: it exposes only the columns a marketing listing needs,
-- for approved experts only.
--
-- Deliberately NOT security_invoker. The view is owned by postgres and so
-- reads the underlying tables with the owner's rights, bypassing their RLS.
-- That is the point: anon must not reach `profiles` directly, but must be able
-- to read this curated subset. Never add email, phone, or any other contact
-- column here — anon can read every row of this view.
-- ============================================================================

begin;

create or replace view public.public_experts as
  select
    p.id,
    p.full_name,
    e.professional_title,
    e.bio,
    e.location,
    e.avatar_url,
    e.specialties,
    e.years_experience,
    e.session_rate_inr
  from public.profiles p
  join public.expert_profiles e on e.profile_id = p.id
  where p.role = 'expert'
    and e.status = 'approved';

comment on view public.public_experts is
  'Public, anon-readable directory of approved experts. Safe columns only — never add email or phone.';

grant select on public.public_experts to anon, authenticated;

commit;
