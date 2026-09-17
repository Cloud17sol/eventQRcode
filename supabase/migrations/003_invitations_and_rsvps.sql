-- Phase 4: invitations, RSVPs, and credential RPCs.
-- Additive. invitations.credential_secret is not selectable via the Data API.
-- Guests look up invitations only through open_invitation / submit_rsvp.

alter table public.events
  add column if not exists access_pass_enabled boolean not null default true;

alter table public.events
  add column if not exists allow_maybe_rsvp boolean not null default false;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,
  invitation_number text not null unique,
  credential_hash text not null unique,
  credential_secret text not null,
  status text not null default 'active',
  delivery_method text,
  sent_at timestamptz,
  opened_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_guest_unique unique (guest_id),
  constraint invitations_status_check check (
    status in ('active', 'revoked', 'expired', 'cancelled')
  )
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,
  status text not null default 'pending',
  attending_count integer,
  message text,
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint rsvps_invitation_unique unique (invitation_id),
  constraint rsvps_status_check check (
    status in ('pending', 'attending', 'not_attending', 'maybe')
  )
);

create index if not exists invitations_event_id_idx on public.invitations (event_id);
create index if not exists invitations_status_idx on public.invitations (event_id, status);
create index if not exists rsvps_event_id_idx on public.rsvps (event_id);

drop trigger if exists invitations_set_updated_at on public.invitations;
create trigger invitations_set_updated_at
before update on public.invitations
for each row execute function public.set_updated_at();

drop trigger if exists rsvps_set_updated_at on public.rsvps;
create trigger rsvps_set_updated_at
before update on public.rsvps
for each row execute function public.set_updated_at();

alter table public.invitations enable row level security;
alter table public.rsvps enable row level security;

revoke all on table public.invitations from anon, authenticated, public;

drop policy if exists "rsvps_select_own" on public.rsvps;
create policy "rsvps_select_own"
on public.rsvps
for select
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = rsvps.event_id
      and events.organizer_id = auth.uid()
  )
);

create or replace function public.hash_invite_token(p_token text)
returns text
language sql
immutable
as $$
  select encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.new_invite_token()
returns text
language sql
volatile
as $$
  select rtrim(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=');
$$;

create or replace function public.new_invitation_number()
returns text
language sql
volatile
as $$
  select 'INV-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
$$;

create or replace function public.organizer_owns_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events
    where id = p_event_id
      and organizer_id = auth.uid()
  );
$$;

create or replace function public.issue_invitation(p_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests%rowtype;
  v_existing public.invitations%rowtype;
  v_token text;
  v_hash text;
  v_number text;
begin
  if auth.uid() is null then
    raise exception 'You need to sign in first.';
  end if;

  select * into v_guest from public.guests where id = p_guest_id;
  if not found then
    raise exception 'Guest not found.';
  end if;

  if not public.organizer_owns_event(v_guest.event_id) then
    raise exception 'You cannot issue invitations for this event.';
  end if;

  select * into v_existing from public.invitations where guest_id = p_guest_id;
  if found then
    return jsonb_build_object(
      'invitation_id', v_existing.id,
      'invitation_number', v_existing.invitation_number,
      'token', v_existing.credential_secret,
      'created', false
    );
  end if;

  v_token := public.new_invite_token();
  v_hash := public.hash_invite_token(v_token);
  v_number := public.new_invitation_number();

  insert into public.invitations (
    event_id, guest_id, invitation_number, credential_hash, credential_secret, status
  )
  values (v_guest.event_id, v_guest.id, v_number, v_hash, v_token, 'active')
  returning * into v_existing;

  insert into public.rsvps (event_id, invitation_id, guest_id, status)
  values (v_guest.event_id, v_existing.id, v_guest.id, 'pending')
  on conflict (invitation_id) do nothing;

  return jsonb_build_object(
    'invitation_id', v_existing.id,
    'invitation_number', v_existing.invitation_number,
    'token', v_token,
    'created', true
  );
end;
$$;

create or replace function public.issue_missing_invitations(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest record;
  v_count integer := 0;
begin
  if not public.organizer_owns_event(p_event_id) then
    raise exception 'You cannot issue invitations for this event.';
  end if;

  for v_guest in
    select g.id
    from public.guests g
    left join public.invitations i on i.guest_id = g.id
    where g.event_id = p_event_id
      and i.id is null
  loop
    perform public.issue_invitation(v_guest.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.list_event_invitations(p_event_id uuid)
returns table (
  invitation_id uuid,
  guest_id uuid,
  guest_name text,
  invitation_number text,
  status text,
  rsvp_status text,
  attending_count integer,
  opened_at timestamptz,
  sent_at timestamptz,
  delivery_method text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.organizer_owns_event(p_event_id) then
    raise exception 'You cannot view invitations for this event.';
  end if;

  return query
  select
    i.id,
    i.guest_id,
    g.display_name,
    i.invitation_number,
    i.status,
    coalesce(r.status, 'pending'),
    r.attending_count,
    i.opened_at,
    i.sent_at,
    i.delivery_method
  from public.invitations i
  join public.guests g on g.id = i.guest_id
  left join public.rsvps r on r.invitation_id = i.id
  where i.event_id = p_event_id
  order by g.display_name;
end;
$$;

create or replace function public.organizer_invite_token(p_invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invitations%rowtype;
begin
  select * into v_inv from public.invitations where id = p_invitation_id;
  if not found then
    raise exception 'Invitation not found.';
  end if;
  if not public.organizer_owns_event(v_inv.event_id) then
    raise exception 'You cannot access this invitation.';
  end if;
  return v_inv.credential_secret;
end;
$$;

create or replace function public.set_invitation_status(p_invitation_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invitations%rowtype;
begin
  if p_status not in ('active', 'revoked', 'cancelled') then
    raise exception 'Invalid invitation status.';
  end if;

  select * into v_inv from public.invitations where id = p_invitation_id;
  if not found then
    raise exception 'Invitation not found.';
  end if;
  if not public.organizer_owns_event(v_inv.event_id) then
    raise exception 'You cannot change this invitation.';
  end if;

  update public.invitations
  set status = p_status
  where id = p_invitation_id
  returning * into v_inv;

  return jsonb_build_object(
    'invitation_id', v_inv.id,
    'status', v_inv.status
  );
end;
$$;

create or replace function public.mark_invitation_shared(p_invitation_id uuid, p_method text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invitations%rowtype;
begin
  select * into v_inv from public.invitations where id = p_invitation_id;
  if not found then
    raise exception 'Invitation not found.';
  end if;
  if not public.organizer_owns_event(v_inv.event_id) then
    raise exception 'You cannot update this invitation.';
  end if;

  update public.invitations
  set delivery_method = p_method,
      sent_at = coalesce(sent_at, now())
  where id = p_invitation_id;
end;
$$;

create or replace function public.open_invitation(p_token text)
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
  v_category text;
  v_rsvp public.rsvps%rowtype;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('status', 'unknown');
  end if;

  v_hash := public.hash_invite_token(trim(p_token));
  select * into v_inv from public.invitations where credential_hash = v_hash;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;

  select * into v_guest from public.guests where id = v_inv.guest_id;
  select * into v_event from public.events where id = v_inv.event_id;
  select name into v_category from public.guest_categories where id = v_guest.guest_category_id;
  select * into v_rsvp from public.rsvps where invitation_id = v_inv.id;

  if v_inv.opened_at is null and v_inv.status = 'active' then
    update public.invitations set opened_at = now() where id = v_inv.id;
    v_inv.opened_at := now();
  end if;

  if v_event.status = 'cancelled' then
    return jsonb_build_object('status', 'event_cancelled', 'event_name', v_event.name);
  end if;

  if v_event.status in ('draft', 'archived') then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if v_inv.status = 'revoked' or v_guest.status = 'blocked' then
    return jsonb_build_object('status', 'revoked');
  end if;

  if v_inv.status in ('expired', 'cancelled') or v_guest.status = 'cancelled' then
    return jsonb_build_object('status', 'expired');
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    return jsonb_build_object('status', 'expired');
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'invitation_number', v_inv.invitation_number,
    'invitation_status', v_inv.status,
    'guest_name', v_guest.display_name,
    'guest_limit', v_guest.guest_limit,
    'category', v_category,
    'table_name', v_guest.table_name,
    'event_name', v_event.name,
    'event_type', v_event.event_type,
    'event_date', v_event.event_date,
    'start_time', v_event.start_time,
    'end_time', v_event.end_time,
    'venue_name', v_event.venue_name,
    'address', v_event.address,
    'city', v_event.city,
    'state', v_event.state,
    'country', v_event.country,
    'description', v_event.description,
    'cover_image_url', v_event.cover_image_url,
    'event_status', v_event.status,
    'allow_rsvp', v_event.allow_rsvp,
    'allow_maybe_rsvp', v_event.allow_maybe_rsvp,
    'access_pass_enabled', v_event.access_pass_enabled,
    'rsvp_status', coalesce(v_rsvp.status, 'pending'),
    'attending_count', v_rsvp.attending_count,
    'rsvp_message', v_rsvp.message
  );
end;
$$;

create or replace function public.submit_rsvp(
  p_token text,
  p_status text,
  p_attending_count integer,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open jsonb;
  v_hash text;
  v_inv public.invitations%rowtype;
  v_guest public.guests%rowtype;
  v_event public.events%rowtype;
  v_count integer;
begin
  v_open := public.open_invitation(p_token);
  if v_open ->> 'status' is distinct from 'ok' then
    return v_open;
  end if;

  v_hash := public.hash_invite_token(trim(p_token));
  select * into v_inv from public.invitations where credential_hash = v_hash;
  select * into v_guest from public.guests where id = v_inv.guest_id;
  select * into v_event from public.events where id = v_inv.event_id;

  if not v_event.allow_rsvp then
    return jsonb_build_object('status', 'rsvp_closed');
  end if;

  if v_event.status not in ('published', 'active') then
    return jsonb_build_object('status', 'rsvp_closed');
  end if;

  if p_status not in ('attending', 'not_attending', 'maybe') then
    return jsonb_build_object('status', 'invalid_rsvp');
  end if;

  if p_status = 'maybe' and not v_event.allow_maybe_rsvp then
    return jsonb_build_object('status', 'invalid_rsvp');
  end if;

  if p_status = 'attending' then
    v_count := coalesce(p_attending_count, 1);
    if v_count < 1 or v_count > v_guest.guest_limit then
      return jsonb_build_object('status', 'invalid_count');
    end if;
  elsif p_status = 'maybe' then
    v_count := least(greatest(coalesce(p_attending_count, 1), 1), v_guest.guest_limit);
  else
    v_count := 0;
  end if;

  insert into public.rsvps (
    event_id, invitation_id, guest_id, status, attending_count, message, responded_at
  )
  values (
    v_event.id, v_inv.id, v_guest.id, p_status, v_count, nullif(trim(coalesce(p_message, '')), ''), now()
  )
  on conflict (invitation_id) do update
  set status = excluded.status,
      attending_count = excluded.attending_count,
      message = excluded.message,
      responded_at = now();

  return public.open_invitation(p_token);
end;
$$;

revoke all on function public.hash_invite_token(text) from public, anon, authenticated;
revoke all on function public.new_invite_token() from public, anon, authenticated;
revoke all on function public.new_invitation_number() from public, anon, authenticated;
revoke all on function public.organizer_owns_event(uuid) from public, anon, authenticated;

grant execute on function public.issue_invitation(uuid) to authenticated;
grant execute on function public.issue_missing_invitations(uuid) to authenticated;
grant execute on function public.list_event_invitations(uuid) to authenticated;
grant execute on function public.organizer_invite_token(uuid) to authenticated;
grant execute on function public.set_invitation_status(uuid, text) to authenticated;
grant execute on function public.mark_invitation_shared(uuid, text) to authenticated;
grant execute on function public.open_invitation(text) to anon, authenticated;
grant execute on function public.submit_rsvp(text, text, integer, text) to anon, authenticated;
