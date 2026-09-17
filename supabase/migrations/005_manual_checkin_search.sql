-- Phase 6: manual door search. Does not expose email, full phone, or notes.

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
  if not public.can_operate_event(p_event_id) then
    raise exception 'You cannot search guests for this event.';
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
  if auth.uid() is null or not public.can_operate_event(p_event_id) then
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

grant execute on function public.search_event_guests(uuid, text) to authenticated;
grant execute on function public.preview_guest_admission(uuid, uuid, uuid) to authenticated;
