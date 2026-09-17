-- Phase 9: security hardening.
-- Additive. Does not change check-in or invitation behavior.

-- Users must not be able to self-promote via profiles.role / is_active.
-- Event access still comes from organizer_id and event_staff, not this column.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.id := old.id;
  new.role := old.role;
  new.is_active := old.is_active;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

revoke all on function public.protect_profile_privileges() from public, anon, authenticated;

-- Check-ins are append-only and read through RPCs, not the Data API.
revoke select, insert, update, delete on table public.check_ins from public, anon, authenticated;
revoke insert, update, delete on table public.rsvps from public, anon, authenticated;

-- Manual search must not treat % / _ as "return everyone".
create or replace function public.search_event_guests(p_event_id uuid, p_query text)
returns table (
  invitation_id uuid,
  guest_id uuid,
  guest_name text,
  category text,
  table_name text,
  phone_ending text,
  invitation_number text,
  guest_limit integer,
  admitted integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text;
  v_digits text;
begin
  if auth.uid() is null or not public.can_manual_checkin_event(p_event_id) then
    raise exception 'You cannot search guests at this door.';
  end if;

  v_q := trim(coalesce(p_query, ''));
  if length(v_q) < 2 then
    return;
  end if;

  v_q := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
  v_digits := regexp_replace(trim(coalesce(p_query, '')), '\D', '', 'g');

  return query
  select
    i.id,
    g.id,
    g.display_name,
    c.name,
    g.table_name,
    case
      when length(regexp_replace(coalesce(g.phone, ''), '\D', '', 'g')) >= 4
        then '******' || right(regexp_replace(g.phone, '\D', '', 'g'), 4)
      else null
    end,
    i.invitation_number,
    g.guest_limit,
    case when i.id is null then 0 else public.invitation_admitted_count(i.id) end,
    greatest(
      g.guest_limit - case when i.id is null then 0 else public.invitation_admitted_count(i.id) end,
      0
    )
  from public.guests g
  left join public.invitations i on i.guest_id = g.id
  left join public.guest_categories c on c.id = g.guest_category_id
  where g.event_id = p_event_id
    and (
      g.display_name ilike '%' || v_q || '%' escape '\'
      or (i.invitation_number is not null and i.invitation_number ilike '%' || v_q || '%' escape '\')
      or (
        length(v_digits) >= 3
        and regexp_replace(coalesce(g.phone, ''), '\D', '', 'g') like '%' || v_digits || '%'
      )
    )
  order by g.display_name
  limit 20;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default. Keep the two guest RPCs public;
-- everything else is authenticated-only.
revoke all on function public.issue_invitation(uuid) from public, anon;
revoke all on function public.issue_missing_invitations(uuid) from public, anon;
revoke all on function public.list_event_invitations(uuid) from public, anon;
revoke all on function public.organizer_invite_token(uuid) from public, anon;
revoke all on function public.set_invitation_status(uuid, text) from public, anon;
revoke all on function public.mark_invitation_shared(uuid, text) from public, anon;
revoke all on function public.list_invitation_admissions(uuid) from public, anon;
revoke all on function public.event_admission_summary(uuid) from public, anon;
revoke all on function public.list_recent_check_ins(uuid, integer) from public, anon;
revoke all on function public.validate_event_credential(text, uuid, uuid) from public, anon;
revoke all on function public.check_in_guest(uuid, uuid, integer, uuid, text) from public, anon;
revoke all on function public.search_event_guests(uuid, text) from public, anon;
revoke all on function public.preview_guest_admission(uuid, uuid, uuid) from public, anon;
revoke all on function public.event_access(uuid) from public, anon;
revoke all on function public.assign_event_staff(uuid, text, text) from public, anon;
revoke all on function public.list_event_staff(uuid) from public, anon;
revoke all on function public.remove_event_staff(uuid) from public, anon;
revoke all on function public.set_event_staff_role(uuid, text) from public, anon;
revoke all on function public.event_dashboard(uuid) from public, anon;

grant execute on function public.issue_invitation(uuid) to authenticated;
grant execute on function public.issue_missing_invitations(uuid) to authenticated;
grant execute on function public.list_event_invitations(uuid) to authenticated;
grant execute on function public.organizer_invite_token(uuid) to authenticated;
grant execute on function public.set_invitation_status(uuid, text) to authenticated;
grant execute on function public.mark_invitation_shared(uuid, text) to authenticated;
grant execute on function public.list_invitation_admissions(uuid) to authenticated;
grant execute on function public.event_admission_summary(uuid) to authenticated;
grant execute on function public.list_recent_check_ins(uuid, integer) to authenticated;
grant execute on function public.validate_event_credential(text, uuid, uuid) to authenticated;
grant execute on function public.check_in_guest(uuid, uuid, integer, uuid, text) to authenticated;
grant execute on function public.search_event_guests(uuid, text) to authenticated;
grant execute on function public.preview_guest_admission(uuid, uuid, uuid) to authenticated;
grant execute on function public.event_access(uuid) to authenticated;
grant execute on function public.assign_event_staff(uuid, text, text) to authenticated;
grant execute on function public.list_event_staff(uuid) to authenticated;
grant execute on function public.remove_event_staff(uuid) to authenticated;
grant execute on function public.set_event_staff_role(uuid, text) to authenticated;
grant execute on function public.event_dashboard(uuid) to authenticated;

revoke all on function public.open_invitation(text) from public;
revoke all on function public.submit_rsvp(text, text, integer, text) from public;
grant execute on function public.open_invitation(text) to anon, authenticated;
grant execute on function public.submit_rsvp(text, text, integer, text) to anon, authenticated;
