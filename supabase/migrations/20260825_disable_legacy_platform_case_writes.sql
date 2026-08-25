-- KineCheck privacy hardening — 2026-08-25
-- The legacy /platform UI now redirects to /academy and must not remain a writable
-- free-text store for clinical/student cases. Preserve SELECT/DELETE paths already
-- protected by RLS so existing owner records can still be reviewed/removed through
-- controlled tooling, but prevent creation or mutation of new case content.

revoke insert, update, truncate, references, trigger
on table public.platform_cases
from anon, authenticated;

revoke insert, update, truncate, references, trigger
on table public.platform_case_events
from anon, authenticated;

comment on table public.platform_cases is
'Legacy KineCheck platform case store. New authenticated writes disabled 2026-08-25; do not use as a clinical record or patient repository.';

comment on table public.platform_case_events is
'Legacy KineCheck platform case events. New authenticated writes disabled 2026-08-25.';
