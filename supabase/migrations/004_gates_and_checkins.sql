-- Phase 5: gates, check-ins, and scanner RPCs.
-- Additive. Check-ins are append-only; mutations go through RPCs only.

create or replace function public.hash_invite_token(p_token text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.new_invite_token()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select rtrim(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=');
$$;

create or replace function public.new_invitation_number()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select 'INV-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
$$;

revoke all on function public.hash_invite_token(text) from public, anon, authenticated;
revoke all on function public.new_invite_token() from public, anon, authenticated;
revoke all on function public.new_invitation_number() from public, anon, authenticated;

alter table public.events
  add column if not exists fast_scan_enabled boolean not null default false;

create table if not exists public.gates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gates_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,
  staff_user_id uuid not null references public.profiles (id),
  gate_id uuid references public.gates (id) on delete restrict,
  method text not null,
  quantity integer not null,
  action text not null default 'check_in',
  notes text,
  device_id text,
  created_at timestamptz not null default now(),
  constraint check_ins_method_check check (method in ('qr', 'manual', 'offline_sync', 'override')),
  constraint check_ins_action_check check (action in ('check_in', 'check_out', 'undo', 'override')),
  constraint check_ins_quantity_check check (quantity >= 1)
);

create index if not exists gates_event_id_idx on public.gates (event_id);
create index if not exists check_ins_event_id_idx on public.check_ins (event_id, created_at desc);
create index if not exists check_ins_invitation_id_idx on public.check_ins (invitation_id);

drop trigger if exists gates_set_updated_at on public.gates;
create trigger gates_set_updated_at
before update on public.gates
for each row execute function public.set_updated_at();

alter table public.gates enable row level security;
alter table public.check_ins enable row level security;

revoke insert, update, delete on table public.check_ins from anon, authenticated, public;

drop policy if exists "gates_select_own" on public.gates;
create policy "gates_select_own"
on public.gates for select to authenticated
using (public.organizer_owns_event(event_id));

drop policy if exists "gates_insert_own" on public.gates;
create policy "gates_insert_own"
on public.gates for insert to authenticated
with check (public.organizer_owns_event(event_id));

drop policy if exists "gates_update_own" on public.gates;
create policy "gates_update_own"
on public.gates for update to authenticated
using (public.organizer_owns_event(event_id))
with check (public.organizer_owns_event(event_id));

drop policy if exists "gates_delete_own" on public.gates;
create policy "gates_delete_own"
on public.gates for delete to authenticated
using (
  public.organizer_owns_event(event_id)
  and not exists (select 1 from public.check_ins where check_ins.gate_id = gates.id)
);

drop policy if exists "check_ins_select_own" on public.check_ins;
create policy "check_ins_select_own"
on public.check_ins for select to authenticated
using (public.organizer_owns_event(event_id));

create or replace function public.can_operate_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.organizer_owns_event(p_event_id);
$$;

create or replace function public.invitation_admitted_count(p_invitation_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(quantity), 0)::integer
  from public.check_ins
  where invitation_id = p_invitation_id
    and action = 'check_in';
$$;

create or replace function public.create_default_event_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.gates (event_id, name, is_active)
  values (new.id, 'Main Entrance', true);
  return new;
end;
$$;

drop trigger if exists events_create_default_gate on public.events;
create trigger events_create_default_gate
after insert on public.events
for each row execute function public.create_default_event_gate();

insert into public.gates (event_id, name, is_active)
select e.id, 'Main Entrance', true
from public.events e
where not exists (select 1 from public.gates g where g.event_id = e.id);

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
  if not public.can_operate_event(p_event_id) then
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

create or replace function public.event_admission_summary(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected integer;
  v_checked integer;
begin
  if not public.can_operate_event(p_event_id) then
    raise exception 'You cannot view admissions for this event.';
  end if;

  select coalesce(sum(guest_limit), 0) into v_expected
  from public.guests
  where event_id = p_event_id
    and status = 'active';

  select coalesce(sum(quantity), 0) into v_checked
  from public.check_ins
  where event_id = p_event_id
    and action = 'check_in';

  return jsonb_build_object(
    'expected', v_expected,
    'checked_in', v_checked,
    'remaining', greatest(v_expected - v_checked, 0)
  );
end;
$$;

create or replace function public.list_recent_check_ins(p_event_id uuid, p_limit integer default 20)
returns table (
  check_in_id uuid,
  guest_name text,
  quantity integer,
  method text,
  gate_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_operate_event(p_event_id) then
    raise exception 'You cannot view check-ins for this event.';
  end if;

  return query
  select
    c.id,
    g.display_name,
    c.quantity,
    c.method,
    gt.name,
    c.created_at
  from public.check_ins c
  join public.guests g on g.id = c.guest_id
  left join public.gates gt on gt.id = c.gate_id
  where c.event_id = p_event_id
    and c.action = 'check_in'
  order by c.created_at desc
  limit greatest(coalesce(p_limit, 20), 1);
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
  if auth.uid() is null then
    return jsonb_build_object('valid', false, 'status', 'unauthorized');
  end if;

  if not public.can_operate_event(p_event_id) then
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
  if auth.uid() is null or not public.can_operate_event(p_event_id) then
    return jsonb_build_object('ok', false, 'status', 'unauthorized');
  end if;

  v_method := coalesce(nullif(trim(p_method), ''), 'qr');
  if v_method not in ('qr', 'manual', 'override') then
    return jsonb_build_object('ok', false, 'status', 'invalid_method');
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

revoke all on function public.can_operate_event(uuid) from public, anon, authenticated;
revoke all on function public.invitation_admitted_count(uuid) from public, anon, authenticated;
revoke all on function public.create_default_event_gate() from public, anon, authenticated;

grant execute on function public.list_invitation_admissions(uuid) to authenticated;
grant execute on function public.event_admission_summary(uuid) to authenticated;
grant execute on function public.list_recent_check_ins(uuid, integer) to authenticated;
grant execute on function public.validate_event_credential(text, uuid, uuid) to authenticated;
grant execute on function public.check_in_guest(uuid, uuid, integer, uuid, text) to authenticated;
