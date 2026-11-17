-- Access pass branding: background color, public logo uploads, and guest-visible fields.

alter table public.events
  add column if not exists pass_background_color text not null default '#FFFFFF';

alter table public.events
  drop constraint if exists events_pass_background_color_check;

alter table public.events
  add constraint events_pass_background_color_check
  check (pass_background_color ~ '^#[0-9A-Fa-f]{6}$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-assets',
  'event-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "event_assets_public_read" on storage.objects;
create policy "event_assets_public_read"
on storage.objects
for select
using (bucket_id = 'event-assets');

drop policy if exists "event_assets_organizer_insert" on storage.objects;
create policy "event_assets_organizer_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-assets'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.organizer_owns_event(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "event_assets_organizer_update" on storage.objects;
create policy "event_assets_organizer_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-assets'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.organizer_owns_event(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'event-assets'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.organizer_owns_event(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "event_assets_organizer_delete" on storage.objects;
create policy "event_assets_organizer_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-assets'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.organizer_owns_event(((storage.foldername(name))[1])::uuid)
);

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
    'logo_url', v_event.logo_url,
    'pass_background_color', v_event.pass_background_color,
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
