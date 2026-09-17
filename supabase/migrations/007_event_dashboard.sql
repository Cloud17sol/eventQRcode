-- Phase 8: live event dashboard totals.
-- Additive. Staff get counts through this RPC, not guest or invitation SELECT.
-- Realtime uses event_live_pulse so check-in and RSVP payloads stay off the wire.

create table if not exists public.event_live_pulse (
  event_id uuid primary key references public.events (id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.event_live_pulse enable row level security;

revoke insert, update, delete on table public.event_live_pulse from anon, authenticated, public;

drop policy if exists "event_live_pulse_select" on public.event_live_pulse;
create policy "event_live_pulse_select"
on public.event_live_pulse
for select
to authenticated
using (public.can_view_event(event_id));

create or replace function public.touch_event_live_pulse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if tg_op = 'DELETE' then
    v_event_id := old.event_id;
  else
    v_event_id := new.event_id;
  end if;

  insert into public.event_live_pulse (event_id, updated_at)
  values (v_event_id, now())
  on conflict (event_id) do update set updated_at = excluded.updated_at;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists check_ins_live_pulse on public.check_ins;
create trigger check_ins_live_pulse
after insert on public.check_ins
for each row execute function public.touch_event_live_pulse();

drop trigger if exists rsvps_live_pulse on public.rsvps;
create trigger rsvps_live_pulse
after insert or update on public.rsvps
for each row execute function public.touch_event_live_pulse();

drop trigger if exists invitations_live_pulse on public.invitations;
create trigger invitations_live_pulse
after insert or update on public.invitations
for each row execute function public.touch_event_live_pulse();

drop trigger if exists guests_live_pulse on public.guests;
create trigger guests_live_pulse
after insert or update or delete on public.guests
for each row execute function public.touch_event_live_pulse();

do $$
begin
  alter publication supabase_realtime add table public.event_live_pulse;
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.event_dashboard(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invited integer;
  v_expected integer;
  v_checked integer;
  v_attending integer;
  v_maybe integer;
  v_declined integer;
  v_pending integer;
  v_vip_expected integer;
  v_vip_checked integer;
  v_general_expected integer;
  v_general_checked integer;
  v_gates jsonb;
  v_recent jsonb;
begin
  if not public.can_operate_event(p_event_id) then
    raise exception 'You cannot view this event dashboard.';
  end if;

  select
    count(*)::integer,
    coalesce(sum(guest_limit), 0)::integer
  into v_invited, v_expected
  from public.guests
  where event_id = p_event_id
    and status = 'active';

  select coalesce(sum(quantity), 0)::integer into v_checked
  from public.check_ins
  where event_id = p_event_id
    and action = 'check_in';

  select
    count(*) filter (where coalesce(r.status, 'pending') = 'attending')::integer,
    count(*) filter (where coalesce(r.status, 'pending') = 'maybe')::integer,
    count(*) filter (where coalesce(r.status, 'pending') = 'not_attending')::integer,
    count(*) filter (where coalesce(r.status, 'pending') = 'pending')::integer
  into v_attending, v_maybe, v_declined, v_pending
  from public.invitations i
  join public.guests g on g.id = i.guest_id
  left join public.rsvps r on r.invitation_id = i.id
  where i.event_id = p_event_id
    and i.status = 'active'
    and g.status = 'active';

  select
    coalesce(sum(g.guest_limit) filter (where lower(coalesce(c.name, '')) like '%vip%'), 0)::integer,
    coalesce(sum(g.guest_limit) filter (where lower(coalesce(c.name, '')) not like '%vip%'), 0)::integer
  into v_vip_expected, v_general_expected
  from public.guests g
  left join public.guest_categories c on c.id = g.guest_category_id
  where g.event_id = p_event_id
    and g.status = 'active';

  select
    coalesce(sum(ci.quantity) filter (where lower(coalesce(c.name, '')) like '%vip%'), 0)::integer,
    coalesce(sum(ci.quantity) filter (where lower(coalesce(c.name, '')) not like '%vip%'), 0)::integer
  into v_vip_checked, v_general_checked
  from public.check_ins ci
  join public.guests g on g.id = ci.guest_id
  left join public.guest_categories c on c.id = g.guest_category_id
  where ci.event_id = p_event_id
    and ci.action = 'check_in';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', gt.id,
        'name', gt.name,
        'is_active', gt.is_active,
        'checked_in', coalesce(admitted.total, 0)
      )
      order by gt.is_active desc, gt.name
    ),
    '[]'::jsonb
  )
  into v_gates
  from public.gates gt
  left join (
    select gate_id, sum(quantity)::integer as total
    from public.check_ins
    where event_id = p_event_id
      and action = 'check_in'
      and gate_id is not null
    group by gate_id
  ) admitted on admitted.gate_id = gt.id
  where gt.event_id = p_event_id;

  select coalesce(
    jsonb_agg(to_jsonb(activity)),
    '[]'::jsonb
  )
  into v_recent
  from (
    select
      c.id as check_in_id,
      g.display_name as guest_name,
      c.quantity,
      c.method,
      gt.name as gate_name,
      c.created_at
    from public.check_ins c
    join public.guests g on g.id = c.guest_id
    left join public.gates gt on gt.id = c.gate_id
    where c.event_id = p_event_id
      and c.action = 'check_in'
    order by c.created_at desc
    limit 8
  ) activity;

  return jsonb_build_object(
    'invited', v_invited,
    'expected', v_expected,
    'checked_in', v_checked,
    'remaining', greatest(v_expected - v_checked, 0),
    'check_in_percent', case
      when v_expected = 0 then 0
      else round((v_checked::numeric / v_expected::numeric) * 100)::integer
    end,
    'rsvp_attending', coalesce(v_attending, 0),
    'rsvp_maybe', coalesce(v_maybe, 0),
    'rsvp_declined', coalesce(v_declined, 0),
    'rsvp_pending', coalesce(v_pending, 0),
    'vip_expected', v_vip_expected,
    'vip_checked_in', v_vip_checked,
    'general_expected', v_general_expected,
    'general_checked_in', v_general_checked,
    'gates', v_gates,
    'recent', v_recent
  );
end;
$$;

revoke all on function public.event_dashboard(uuid) from public, anon;
grant execute on function public.event_dashboard(uuid) to authenticated;
grant execute on function public.touch_event_live_pulse() to postgres;
revoke all on function public.touch_event_live_pulse() from public, anon, authenticated;
