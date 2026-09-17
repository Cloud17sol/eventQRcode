-- Phase 7: event staff assignments and door-permission enforcement.
-- Additive. Event permissions come from event_staff, not profiles.role.

create table if not exists public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  can_scan boolean not null default true,
  can_manual_checkin boolean not null default true,
  can_override boolean not null default false,
  can_undo_checkin boolean not null default false,
  can_view_guest_details boolean not null default false,
  created_at timestamptz not null default now(),
  constraint event_staff_role_check check (role in ('scanner', 'gate_supervisor', 'event_manager')),
  constraint event_staff_unique unique (event_id, user_id)
);

create index if not exists event_staff_event_id_idx on public.event_staff (event_id);
create index if not exists event_staff_user_id_idx on public.event_staff (user_id);

alter table public.event_staff enable row level security;

create or replace function public.can_view_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.organizer_owns_event(p_event_id)
      or exists (
        select 1 from public.event_staff
        where event_id = p_event_id
          and user_id = auth.uid()
      );
$$;

create or replace function public.can_operate_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_view_event(p_event_id);
$$;

create or replace function public.can_scan_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.organizer_owns_event(p_event_id)
      or exists (
        select 1 from public.event_staff
        where event_id = p_event_id
          and user_id = auth.uid()
          and can_scan
      );
$$;

create or replace function public.can_manual_checkin_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.organizer_owns_event(p_event_id)
      or exists (
        select 1 from public.event_staff
        where event_id = p_event_id
          and user_id = auth.uid()
          and can_manual_checkin
      );
$$;

create or replace function public.can_override_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.organizer_owns_event(p_event_id)
      or exists (
        select 1 from public.event_staff
        where event_id = p_event_id
          and user_id = auth.uid()
          and can_override
      );
$$;

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own"
on public.events
for select
to authenticated
using (public.can_view_event(id));

drop policy if exists "gates_select_own" on public.gates;
create policy "gates_select_own"
on public.gates
for select
to authenticated
using (public.can_view_event(event_id));

drop policy if exists "check_ins_select_own" on public.check_ins;
create policy "check_ins_select_own"
on public.check_ins
for select
to authenticated
using (public.can_view_event(event_id));

drop policy if exists "event_staff_select" on public.event_staff;
create policy "event_staff_select"
on public.event_staff
for select
to authenticated
using (public.organizer_owns_event(event_id) or user_id = auth.uid());

drop policy if exists "event_staff_insert" on public.event_staff;
create policy "event_staff_insert"
on public.event_staff
for insert
to authenticated
with check (public.organizer_owns_event(event_id));

drop policy if exists "event_staff_update" on public.event_staff;
create policy "event_staff_update"
on public.event_staff
for update
to authenticated
using (public.organizer_owns_event(event_id))
with check (public.organizer_owns_event(event_id));

drop policy if exists "event_staff_delete" on public.event_staff;
create policy "event_staff_delete"
on public.event_staff
for delete
to authenticated
using (public.organizer_owns_event(event_id));

create or replace function public.staff_role_flags(p_role text)
returns table (
  can_scan boolean,
  can_manual_checkin boolean,
  can_override boolean,
  can_undo_checkin boolean,
  can_view_guest_details boolean
)
language sql
immutable
as $$
  select
    true,
    true,
    p_role in ('gate_supervisor', 'event_manager'),
    p_role in ('gate_supervisor', 'event_manager'),
    p_role in ('gate_supervisor', 'event_manager');
$$;

create or replace function public.event_access(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.event_staff%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('role', 'none', 'is_organizer', false, 'can_manage', false);
  end if;

  if public.organizer_owns_event(p_event_id) then
    return jsonb_build_object(
      'role', 'organizer',
      'is_organizer', true,
      'can_manage', true,
      'can_scan', true,
      'can_manual_checkin', true,
      'can_override', true,
      'can_undo_checkin', true,
      'can_view_guest_details', true
    );
  end if;

  select * into v_staff
  from public.event_staff
  where event_id = p_event_id
    and user_id = auth.uid();

  if not found then
    return jsonb_build_object(
      'role', 'none',
      'is_organizer', false,
      'can_manage', false,
      'can_scan', false,
      'can_manual_checkin', false,
      'can_override', false,
      'can_undo_checkin', false,
      'can_view_guest_details', false
    );
  end if;

  return jsonb_build_object(
    'role', v_staff.role,
    'is_organizer', false,
    'can_manage', false,
    'can_scan', v_staff.can_scan,
    'can_manual_checkin', v_staff.can_manual_checkin,
    'can_override', v_staff.can_override,
    'can_undo_checkin', v_staff.can_undo_checkin,
    'can_view_guest_details', v_staff.can_view_guest_details
  );
end;
$$;

create or replace function public.assign_event_staff(p_event_id uuid, p_email text, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_event public.events%rowtype;
  v_flags record;
  v_row public.event_staff%rowtype;
begin
  if not public.organizer_owns_event(p_event_id) then
    raise exception 'Only the organizer can assign staff.';
  end if;

  if p_role not in ('scanner', 'gate_supervisor', 'event_manager') then
    raise exception 'Choose scanner, gate supervisor, or event manager.';
  end if;

  select * into v_event from public.events where id = p_event_id;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'No Doorlist account uses that email. Ask them to sign up first.';
  end if;

  if v_user_id = v_event.organizer_id then
    raise exception 'The organizer already has full access to this event.';
  end if;

  select * into v_flags from public.staff_role_flags(p_role);

  insert into public.event_staff (
    event_id, user_id, role, can_scan, can_manual_checkin, can_override, can_undo_checkin, can_view_guest_details
  )
  values (
    p_event_id, v_user_id, p_role, v_flags.can_scan, v_flags.can_manual_checkin, v_flags.can_override, v_flags.can_undo_checkin, v_flags.can_view_guest_details
  )
  on conflict (event_id, user_id) do update
  set role = excluded.role,
      can_scan = excluded.can_scan,
      can_manual_checkin = excluded.can_manual_checkin,
      can_override = excluded.can_override,
      can_undo_checkin = excluded.can_undo_checkin,
      can_view_guest_details = excluded.can_view_guest_details
  returning * into v_row;

  return jsonb_build_object(
    'staff_id', v_row.id,
    'user_id', v_row.user_id,
    'role', v_row.role
  );
end;
$$;

create or replace function public.list_event_staff(p_event_id uuid)
returns table (
  staff_id uuid,
  user_id uuid,
  full_name text,
  email text,
  role text,
  can_scan boolean,
  can_manual_checkin boolean,
  can_override boolean,
  can_undo_checkin boolean,
  can_view_guest_details boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.organizer_owns_event(p_event_id) then
    raise exception 'Only the organizer can view staff.';
  end if;

  return query
  select
    es.id,
    es.user_id,
    p.full_name,
    u.email::text,
    es.role,
    es.can_scan,
    es.can_manual_checkin,
    es.can_override,
    es.can_undo_checkin,
    es.can_view_guest_details
  from public.event_staff es
  join public.profiles p on p.id = es.user_id
  join auth.users u on u.id = es.user_id
  where es.event_id = p_event_id
  order by p.full_name, u.email;
end;
$$;

create or replace function public.remove_event_staff(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.event_staff%rowtype;
begin
  select * into v_row from public.event_staff where id = p_staff_id;
  if not found then
    raise exception 'Staff assignment not found.';
  end if;
  if not public.organizer_owns_event(v_row.event_id) then
    raise exception 'Only the organizer can remove staff.';
  end if;
  delete from public.event_staff where id = p_staff_id;
end;
$$;

create or replace function public.set_event_staff_role(p_staff_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.event_staff%rowtype;
  v_flags record;
begin
  if p_role not in ('scanner', 'gate_supervisor', 'event_manager') then
    raise exception 'Choose scanner, gate supervisor, or event manager.';
  end if;

  select * into v_row from public.event_staff where id = p_staff_id;
  if not found then
    raise exception 'Staff assignment not found.';
  end if;
  if not public.organizer_owns_event(v_row.event_id) then
    raise exception 'Only the organizer can change staff roles.';
  end if;

  select * into v_flags from public.staff_role_flags(p_role);

  update public.event_staff
  set role = p_role,
      can_scan = v_flags.can_scan,
      can_manual_checkin = v_flags.can_manual_checkin,
      can_override = v_flags.can_override,
      can_undo_checkin = v_flags.can_undo_checkin,
      can_view_guest_details = v_flags.can_view_guest_details
  where id = p_staff_id;
end;
$$;

create or replace function public.list_invitation_admissions(p_event_id uuid)
returns table (
  guest_id uuid,
  invitation_id uuid,
  guest_limit integer,
  admitted integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.organizer_owns_event(p_event_id) then
    raise exception 'You cannot view admissions for this event.';
  end if;

  return query
  select
    g.id,
    i.id,
    g.guest_limit,
    public.invitation_admitted_count(i.id),
    greatest(g.guest_limit - public.invitation_admitted_count(i.id), 0)
  from public.guests g
  left join public.invitations i on i.guest_id = g.id
  where g.event_id = p_event_id;
end;
$$;

create or replace function public.validate_event_credential(
  p_token text,
  p_event_id uuid,
  p_gate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_inv public.invitations%rowtype;
  v_guest public.guests%rowtype;
  v_event public.events%rowtype;
  v_gate public.gates%rowtype;
  v_category text;
  v_admitted integer;
  v_remaining integer;
  v_last_at timestamptz;
  v_last_gate text;
  v_status text;
begin
  if auth.uid() is null or not public.can_scan_event(p_event_id) then
    return jsonb_build_object('valid', false, 'status', 'unauthorized');
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('valid', false, 'status', 'unknown');
  end if;

  select * into v_gate from public.gates where id = p_gate_id and event_id = p_event_id;
  if not found or not v_gate.is_active then
    return jsonb_build_object('valid', false, 'status', 'invalid_gate');
  end if;

  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('valid', false, 'status', 'unknown');
  end if;

  v_hash := public.hash_invite_token(trim(p_token));
  select * into v_inv from public.invitations where credential_hash = v_hash;
  if not found then
    return jsonb_build_object('valid', false, 'status', 'unknown');
  end if;

  if v_inv.event_id is distinct from p_event_id then
    return jsonb_build_object('valid', false, 'status', 'wrong_event');
  end if;

  select * into v_guest from public.guests where id = v_inv.guest_id;
  select name into v_category from public.guest_categories where id = v_guest.guest_category_id;

  if v_event.status = 'cancelled' then
    return jsonb_build_object('valid', false, 'status', 'event_cancelled', 'event_name', v_event.name);
  end if;

  if v_event.status is distinct from 'active' then
    return jsonb_build_object('valid', false, 'status', 'event_not_open', 'event_status', v_event.status);
  end if;

  if v_inv.status = 'revoked' or v_guest.status = 'blocked' then
    return jsonb_build_object('valid', false, 'status', 'revoked');
  end if;

  if v_inv.status in ('expired', 'cancelled') or v_guest.status = 'cancelled' then
    return jsonb_build_object('valid', false, 'status', 'expired');
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    return jsonb_build_object('valid', false, 'status', 'expired');
  end if;

  v_admitted := public.invitation_admitted_count(v_inv.id);
  v_remaining := greatest(v_guest.guest_limit - v_admitted, 0);

  select c.created_at, gt.name
  into v_last_at, v_last_gate
  from public.check_ins c
  left join public.gates gt on gt.id = c.gate_id
  where c.invitation_id = v_inv.id
    and c.action = 'check_in'
  order by c.created_at desc
  limit 1;

  if v_remaining = 0 then
    v_status := 'fully_used';
  elsif v_admitted > 0 then
    v_status := 'partial';
  else
    v_status := 'valid';
  end if;

  return jsonb_build_object(
    'valid', v_remaining > 0,
    'status', v_status,
    'invitation_id', v_inv.id,
    'guest_name', v_guest.display_name,
    'category', v_category,
    'table_name', v_guest.table_name,
    'guest_limit', v_guest.guest_limit,
    'checked_in', v_admitted,
    'remaining', v_remaining,
    'fast_scan', v_event.fast_scan_enabled and v_guest.guest_limit = 1 and v_remaining = 1,
    'last_entry_at', v_last_at,
    'last_gate', v_last_gate
  );
end;
$$;

create or replace function public.check_in_guest(
  p_event_id uuid,
  p_invitation_id uuid,
  p_quantity integer,
  p_gate_id uuid,
  p_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invitations%rowtype;
  v_guest public.guests%rowtype;
  v_event public.events%rowtype;
  v_gate public.gates%rowtype;
  v_admitted integer;
  v_remaining integer;
  v_quantity integer;
  v_method text;
  v_row public.check_ins%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'unauthorized');
  end if;

  v_method := coalesce(nullif(trim(p_method), ''), 'qr');
  if v_method not in ('qr', 'manual', 'override') then
    return jsonb_build_object('ok', false, 'status', 'invalid_method');
  end if;

  if v_method = 'qr' and not public.can_scan_event(p_event_id) then
    return jsonb_build_object('ok', false, 'status', 'unauthorized');
  end if;
  if v_method = 'manual' and not public.can_manual_checkin_event(p_event_id) then
    return jsonb_build_object('ok', false, 'status', 'unauthorized');
  end if;
  if v_method = 'override' and not public.can_override_event(p_event_id) then
    return jsonb_build_object('ok', false, 'status', 'unauthorized');
  end if;

  v_quantity := coalesce(p_quantity, 1);
  if v_quantity < 1 then
    return jsonb_build_object('ok', false, 'status', 'invalid_count');
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('ok', false, 'status', 'unknown');
  end if;
  if v_event.status is distinct from 'active' then
    return jsonb_build_object('ok', false, 'status', 'event_not_open');
  end if;

  select * into v_gate from public.gates where id = p_gate_id and event_id = p_event_id;
  if not found or not v_gate.is_active then
    return jsonb_build_object('ok', false, 'status', 'invalid_gate');
  end if;

  select * into v_inv
  from public.invitations
  where id = p_invitation_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'unknown');
  end if;

  if v_inv.event_id is distinct from p_event_id then
    return jsonb_build_object('ok', false, 'status', 'wrong_event');
  end if;

  if v_inv.status <> 'active' then
    return jsonb_build_object('ok', false, 'status', case when v_inv.status = 'revoked' then 'revoked' else 'expired' end);
  end if;

  select * into v_guest from public.guests where id = v_inv.guest_id;
  if v_guest.status = 'blocked' then
    return jsonb_build_object('ok', false, 'status', 'revoked');
  end if;
  if v_guest.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'status', 'expired');
  end if;

  v_admitted := public.invitation_admitted_count(v_inv.id);
  v_remaining := greatest(v_guest.guest_limit - v_admitted, 0);

  if v_remaining = 0 then
    return jsonb_build_object(
      'ok', false,
      'status', 'fully_used',
      'guest_name', v_guest.display_name,
      'guest_limit', v_guest.guest_limit,
      'checked_in', v_admitted,
      'remaining', 0
    );
  end if;

  if v_quantity > v_remaining then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid_count',
      'guest_limit', v_guest.guest_limit,
      'checked_in', v_admitted,
      'remaining', v_remaining
    );
  end if;

  insert into public.check_ins (
    event_id, invitation_id, guest_id, staff_user_id, gate_id, method, quantity, action
  )
  values (
    p_event_id, v_inv.id, v_guest.id, auth.uid(), v_gate.id, v_method, v_quantity, 'check_in'
  )
  returning * into v_row;

  v_admitted := v_admitted + v_quantity;
  v_remaining := greatest(v_guest.guest_limit - v_admitted, 0);

  return jsonb_build_object(
    'ok', true,
    'status', 'admitted',
    'check_in_id', v_row.id,
    'guest_name', v_guest.display_name,
    'guest_limit', v_guest.guest_limit,
    'quantity', v_quantity,
    'checked_in', v_admitted,
    'remaining', v_remaining
  );
end;
$$;

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
  if not public.can_manual_checkin_event(p_event_id) then
    raise exception 'You cannot search guests at this door.';
  end if;

  v_q := trim(coalesce(p_query, ''));
  if length(v_q) < 2 then
    return;
  end if;

  v_digits := regexp_replace(v_q, '\D', '', 'g');

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
      g.display_name ilike '%' || v_q || '%'
      or (i.invitation_number is not null and i.invitation_number ilike '%' || v_q || '%')
      or (
        length(v_digits) >= 3
        and regexp_replace(coalesce(g.phone, ''), '\D', '', 'g') like '%' || v_digits || '%'
      )
    )
  order by g.display_name
  limit 20;
end;
$$;

create or replace function public.preview_guest_admission(
  p_event_id uuid,
  p_invitation_id uuid,
  p_gate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invitations%rowtype;
  v_guest public.guests%rowtype;
  v_event public.events%rowtype;
  v_gate public.gates%rowtype;
  v_category text;
  v_admitted integer;
  v_remaining integer;
  v_last_at timestamptz;
  v_last_gate text;
  v_status text;
  v_phone text;
begin
  if auth.uid() is null or not public.can_manual_checkin_event(p_event_id) then
    return jsonb_build_object('valid', false, 'status', 'unauthorized');
  end if;

  if p_invitation_id is null then
    return jsonb_build_object('valid', false, 'status', 'no_invitation');
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('valid', false, 'status', 'unknown');
  end if;

  select * into v_gate from public.gates where id = p_gate_id and event_id = p_event_id;
  if not found or not v_gate.is_active then
    return jsonb_build_object('valid', false, 'status', 'invalid_gate');
  end if;

  select * into v_inv from public.invitations where id = p_invitation_id;
  if not found then
    return jsonb_build_object('valid', false, 'status', 'unknown');
  end if;

  if v_inv.event_id is distinct from p_event_id then
    return jsonb_build_object('valid', false, 'status', 'wrong_event');
  end if;

  select * into v_guest from public.guests where id = v_inv.guest_id;
  select name into v_category from public.guest_categories where id = v_guest.guest_category_id;

  if length(regexp_replace(coalesce(v_guest.phone, ''), '\D', '', 'g')) >= 4 then
    v_phone := '******' || right(regexp_replace(v_guest.phone, '\D', '', 'g'), 4);
  end if;

  if v_event.status = 'cancelled' then
    return jsonb_build_object('valid', false, 'status', 'event_cancelled', 'event_name', v_event.name);
  end if;

  if v_event.status is distinct from 'active' then
    return jsonb_build_object('valid', false, 'status', 'event_not_open', 'event_status', v_event.status);
  end if;

  if v_inv.status = 'revoked' or v_guest.status = 'blocked' then
    return jsonb_build_object(
      'valid', false,
      'status', 'revoked',
      'guest_name', v_guest.display_name,
      'category', v_category,
      'table_name', v_guest.table_name,
      'phone_ending', v_phone
    );
  end if;

  if v_inv.status in ('expired', 'cancelled') or v_guest.status = 'cancelled' then
    return jsonb_build_object(
      'valid', false,
      'status', 'expired',
      'guest_name', v_guest.display_name
    );
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    return jsonb_build_object('valid', false, 'status', 'expired', 'guest_name', v_guest.display_name);
  end if;

  v_admitted := public.invitation_admitted_count(v_inv.id);
  v_remaining := greatest(v_guest.guest_limit - v_admitted, 0);

  select c.created_at, gt.name
  into v_last_at, v_last_gate
  from public.check_ins c
  left join public.gates gt on gt.id = c.gate_id
  where c.invitation_id = v_inv.id
    and c.action = 'check_in'
  order by c.created_at desc
  limit 1;

  if v_remaining = 0 then
    v_status := 'fully_used';
  elsif v_admitted > 0 then
    v_status := 'partial';
  else
    v_status := 'valid';
  end if;

  return jsonb_build_object(
    'valid', v_remaining > 0,
    'status', v_status,
    'invitation_id', v_inv.id,
    'guest_name', v_guest.display_name,
    'category', v_category,
    'table_name', v_guest.table_name,
    'phone_ending', v_phone,
    'guest_limit', v_guest.guest_limit,
    'checked_in', v_admitted,
    'remaining', v_remaining,
    'fast_scan', false,
    'last_entry_at', v_last_at,
    'last_gate', v_last_gate
  );
end;
$$;

revoke all on function public.can_view_event(uuid) from public, anon, authenticated;
revoke all on function public.can_scan_event(uuid) from public, anon, authenticated;
revoke all on function public.can_manual_checkin_event(uuid) from public, anon, authenticated;
revoke all on function public.can_override_event(uuid) from public, anon, authenticated;
revoke all on function public.staff_role_flags(text) from public, anon, authenticated;

grant execute on function public.event_access(uuid) to authenticated;
grant execute on function public.assign_event_staff(uuid, text, text) to authenticated;
grant execute on function public.list_event_staff(uuid) to authenticated;
grant execute on function public.remove_event_staff(uuid) to authenticated;
grant execute on function public.set_event_staff_role(uuid, text) to authenticated;
