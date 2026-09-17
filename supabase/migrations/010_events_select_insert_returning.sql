-- Fix: events SELECT used can_view_event(id), which looks the same events row up.
-- INSERT ... RETURNING cannot see that row yet, so create-event failed RLS.
-- Evaluate organizer_id on the new row, and staff via event_staff.

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own"
on public.events
for select
to authenticated
using (
  organizer_id = auth.uid()
  or exists (
    select 1 from public.event_staff
    where event_id = events.id
      and user_id = auth.uid()
  )
);
