-- Public registration: email is optional. Phone and name stay required.
-- Empty email is stored as null and is not used for duplicate matching.

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

  if v_email <> '' and v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
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
      (v_email <> '' and lower(coalesce(email, '')) = v_email)
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
  values (v_event.id, v_name, nullif(v_email, ''), v_phone, 1, 'active')
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
