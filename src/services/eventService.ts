import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { CreateEventInput, Event, EventWriteInput, UpdateEventInput } from '@/types/database'
import { emptyToNull, slugify } from '@/utils/validation'

function requireConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Connect Supabase before creating or loading events.')
  }
}

function writePayload(input: EventWriteInput) {
  return {
    name: input.name.trim(),
    event_type: emptyToNull(input.event_type),
    description: emptyToNull(input.description),
    event_date: emptyToNull(input.event_date),
    start_time: emptyToNull(input.start_time),
    end_time: emptyToNull(input.end_time),
    venue_name: emptyToNull(input.venue_name),
    address: emptyToNull(input.address),
    city: emptyToNull(input.city),
    state: emptyToNull(input.state),
    country: emptyToNull(input.country),
    timezone: emptyToNull(input.timezone),
    guest_limit: input.guest_limit,
    allow_rsvp: input.allow_rsvp,
    allow_plus_one: input.allow_plus_one,
    access_pass_enabled: input.access_pass_enabled,
    allow_maybe_rsvp: input.allow_maybe_rsvp,
    fast_scan_enabled: input.fast_scan_enabled,
  }
}

export async function listEvents(): Promise<Event[]> {
  requireConfigured()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Event[]
}

export async function getEvent(eventId: string): Promise<Event> {
  requireConfigured()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error) throw new Error(error.message)
  return data as Event
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  requireConfigured()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('You need to sign in before creating an event.')
  }

  const payload = {
    organizer_id: user.id,
    slug: slugify(input.name),
    status: 'draft',
    ...writePayload(input),
  }

  const { data, error } = await supabase.from('events').insert(payload).select('*').single()

  if (error) throw new Error(error.message)
  return data as Event
}

export async function updateEvent(eventId: string, input: UpdateEventInput): Promise<Event> {
  requireConfigured()

  const payload = {
    ...writePayload(input),
    status: input.status,
  }

  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Event
}
