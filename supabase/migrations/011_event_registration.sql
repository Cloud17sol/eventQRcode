-- Public event registration. Invitees join with name, email, and phone.
-- Category, table, and notes stay empty for the organizer to fill later.
-- Registration secrets are not readable through the Data API.

alter table public.events
  add column if not exists registration_enabled boolean not null default false;

create table if not exists public.event_registration (
  event_id uuid primary key references public.events (id) on delete cascade,
  token_hash text not null unique,
  token_secret text not null,
  created_at timestamptz not null default now()
);

alter table public.event_registration enable row level security;
revoke all on table public.event_registration from public, anon, authenticated;

create or replace function public.ensure_event_registration(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if auth.uid() is null or not public.organizer_owns_event(p_event_id) then
    raise exception 'You cannot manage registration for this event.';
  end if;

  select token_secret into v_secret
  from public.event_registration
  where event_id = p_event_id;

  if v_secret is null then
    v_secret := public.new_invite_token();
    insert into public.event_registration (event_id, token_hash, token_secret)
    values (p_event_id, public.hash_invite_token(v_secret), v_secret);
  end if;

  update public.events
  set registration_enabled = true
  where id = p_event_id;

  return v_secret;
end;
$$;

create or replace function public.set_event_registration_enabled(p_event_id uuid, p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.organizer_owns_event(p_event_id) then
    raise exception 'You cannot manage registration for this event.';
  end if;

  if p_enabled then
    perform public.ensure_event_registration(p_event_id);
    return true;
  end if;

  update public.events
  set registration_enabled = false
  where id = p_event_id;

  return false;
end;
$$;

create or replace function public.open_event_registration(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_event public.events%rowtype;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('status', 'unknown');
  end if;

  v_hash := public.hash_invite_token(trim(p_token));

  select e.* into v_event
  from public.event_registration r
  join public.events e on e.id = r.event_id
  where r.token_hash = v_hash;

  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;

  if v_event.status in ('cancelled', 'archived') then
    return jsonb_build_object('status', 'event_cancelled');
  end if;

  if v_event.status = 'completed' or v_event.registration_enabled is not true then
    return jsonb_build_object('status', 'closed');
  end if;

  return jsonb_build_object(
    'status', 'ok',
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
    'cover_image_url', v_event.cover_image_url
  );
end;
$$;

create or replace function public.register_for_event(
  p_token text,
  p_name text,
  p_email text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_event public.events%rowtype;
  v_name text;
  v_email text;
  v_phone text;
  v_guest public.guests%rowtype;
  v_count integer;
  v_token text;
  v_inv public.invitations%rowtype;
begin
  v_name := trim(coalesce(p_name, ''));
  v_email := lower(trim(coalesce(p_email, '')));
  v_phone := trim(coalesce(p_phone, ''));

  if length(v_name) < 2 then
    return jsonb_build_object('status', 'invalid_name');
  end if;

  if v_email = '' or v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    return jsonb_build_object('status', 'invalid_email');
  end if;

  if length(v_phone) < 7 then
    return jsonb_build_object('status', 'invalid_phone');
  end if;

  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('status', 'unknown');
  end if;

  v_hash := public.hash_invite_token(trim(p_token));

  select e.* into v_event
  from public.event_registration r
  join public.events e on e.id = r.event_id
  where r.token_hash = v_hash;

  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;

  if v_event.status in ('cancelled', 'archived') then
    return jsonb_build_object('status', 'event_cancelled');
  end if;

  if v_event.status = 'completed' or v_event.registration_enabled is not true then
    return jsonb_build_object('status', 'closed');
  end if;

  select * into v_guest
  from public.guests
  where event_id = v_event.id
    and (
      lower(coalesce(email, '')) = v_email
      or regexp_replace(coalesce(phone, ''), '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g')
    )
  limit 1;

  if found then
    return jsonb_build_object('status', 'already_registered', 'guest_name', v_guest.display_name);
  end if;

  if v_event.guest_limit is not null then
    select count(*) into v_count
    from public.guests
    where event_id = v_event.id
      and status = 'active';
    if v_count >= v_event.guest_limit then
      return jsonb_build_object('status', 'event_full');
    end if;
  end if;

  insert into public.guests (
    event_id, display_name, email, phone, guest_limit, status
  )
  values (v_event.id, v_name, v_email, v_phone, 1, 'active')
  returning * into v_guest;

  v_token := public.new_invite_token();
  insert into public.invitations (
    event_id, guest_id, invitation_number, credential_hash, credential_secret, status
  )
  values (
    v_event.id,
    v_guest.id,
    public.new_invitation_number(),
    public.hash_invite_token(v_token),
    v_token,
    'active'
  )
  returning * into v_inv;

  insert into public.rsvps (event_id, invitation_id, guest_id, status)
  values (v_event.id, v_inv.id, v_guest.id, 'pending')
  on conflict (invitation_id) do nothing;

  return jsonb_build_object('status', 'ok', 'guest_name', v_guest.display_name);
end;
$$;

revoke all on function public.ensure_event_registration(uuid) from public, anon;
revoke all on function public.set_event_registration_enabled(uuid, boolean) from public, anon;
revoke all on function public.open_event_registration(text) from public;
revoke all on function public.register_for_event(text, text, text, text) from public;

grant execute on function public.ensure_event_registration(uuid) to authenticated;
grant execute on function public.set_event_registration_enabled(uuid, boolean) to authenticated;
grant execute on function public.open_event_registration(text) to anon, authenticated;
grant execute on function public.register_for_event(text, text, text, text) to anon, authenticated;
