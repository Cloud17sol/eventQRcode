-- Fix: RLS policies call can_view_event / organizer_owns_event as the signed-in user.
-- 003 and 006 revoked EXECUTE from authenticated, so event SELECT (and gate/staff policies) failed.
-- These helpers only return a boolean for the current user. Keep them off anon.

grant execute on function public.can_view_event(uuid) to authenticated;
grant execute on function public.organizer_owns_event(uuid) to authenticated;

revoke all on function public.can_view_event(uuid) from public, anon;
revoke all on function public.organizer_owns_event(uuid) from public, anon;
