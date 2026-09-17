-- Phase 3: guest categories and guests.
-- Additive only. Existing profiles/events tables are unchanged.
-- Organizers can only read/write rows for events they own.
-- Guests never receive table access. Phone and email are optional.

create table if not exists public.guest_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  description text,
  default_guest_limit integer not null default 1,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  constraint guest_categories_name_unique unique (event_id, name),
  constraint guest_categories_limit_check check (default_guest_limit >= 1)
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  first_name text,
  last_name text,
  display_name text not null,
  email text,
  phone text,
  company text,
  guest_category_id uuid references public.guest_categories (id) on delete set null,
  table_name text,
  seat_number text,
  guest_limit integer not null default 1,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guests_status_check check (status in ('active', 'blocked', 'cancelled')),
  constraint guests_limit_check check (guest_limit >= 1)
);

create index if not exists guest_categories_event_id_idx on public.guest_categories (event_id);
create index if not exists guests_event_id_idx on public.guests (event_id);
create index if not exists guests_category_id_idx on public.guests (guest_category_id);
create index if not exists guests_display_name_idx on public.guests (event_id, display_name);

drop trigger if exists guests_set_updated_at on public.guests;
create trigger guests_set_updated_at
before update on public.guests
for each row execute function public.set_updated_at();

alter table public.guest_categories enable row level security;
alter table public.guests enable row level security;

drop policy if exists "guest_categories_select_own" on public.guest_categories;
create policy "guest_categories_select_own"
on public.guest_categories
for select
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = guest_categories.event_id
      and events.organizer_id = auth.uid()
  )
);

drop policy if exists "guest_categories_insert_own" on public.guest_categories;
create policy "guest_categories_insert_own"
on public.guest_categories
for insert
to authenticated
with check (
  exists (
    select 1 from public.events
    where events.id = guest_categories.event_id
      and events.organizer_id = auth.uid()
  )
);

drop policy if exists "guest_categories_update_own" on public.guest_categories;
create policy "guest_categories_update_own"
on public.guest_categories
for update
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = guest_categories.event_id
      and events.organizer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events
    where events.id = guest_categories.event_id
      and events.organizer_id = auth.uid()
  )
);

drop policy if exists "guest_categories_delete_own" on public.guest_categories;
create policy "guest_categories_delete_own"
on public.guest_categories
for delete
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = guest_categories.event_id
      and events.organizer_id = auth.uid()
  )
);

drop policy if exists "guests_select_own" on public.guests;
create policy "guests_select_own"
on public.guests
for select
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = guests.event_id
      and events.organizer_id = auth.uid()
  )
);

drop policy if exists "guests_insert_own" on public.guests;
create policy "guests_insert_own"
on public.guests
for insert
to authenticated
with check (
  exists (
    select 1 from public.events
    where events.id = guests.event_id
      and events.organizer_id = auth.uid()
  )
);

drop policy if exists "guests_update_own" on public.guests;
create policy "guests_update_own"
on public.guests
for update
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = guests.event_id
      and events.organizer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events
    where events.id = guests.event_id
      and events.organizer_id = auth.uid()
  )
);

drop policy if exists "guests_delete_own" on public.guests;
create policy "guests_delete_own"
on public.guests
for delete
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = guests.event_id
      and events.organizer_id = auth.uid()
  )
);
