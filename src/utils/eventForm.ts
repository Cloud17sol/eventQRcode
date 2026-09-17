import { z } from 'zod'
import type { Event, EventStatus, EventWriteInput } from '@/types/database'
import { EVENT_STATUSES } from '@/types/event'
import { browserTimezone, toTimeInput } from '@/utils/dates'

export const eventFormSchema = z.object({
  name: z.string().min(2, 'Enter an event name'),
  event_type: z.string().min(1, 'Choose an event type'),
  event_date: z.string().min(1, 'Choose a date'),
  start_time: z.string(),
  end_time: z.string(),
  venue_name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  guest_limit: z.string(),
  description: z.string(),
  allow_rsvp: z.boolean(),
  allow_plus_one: z.boolean(),
  access_pass_enabled: z.boolean(),
  allow_maybe_rsvp: z.boolean(),
  fast_scan_enabled: z.boolean(),
  status: z.string(),
})

export type EventFormValues = z.infer<typeof eventFormSchema>

export const emptyEventFormValues: EventFormValues = {
  name: '',
  event_type: 'wedding',
  event_date: '',
  start_time: '',
  end_time: '',
  venue_name: '',
  address: '',
  city: '',
  state: '',
  country: '',
  guest_limit: '',
  description: '',
  allow_rsvp: true,
  allow_plus_one: false,
  access_pass_enabled: true,
  allow_maybe_rsvp: false,
  fast_scan_enabled: false,
  status: 'draft',
}

export function eventToFormValues(event: Event): EventFormValues {
  return {
    name: event.name,
    event_type: event.event_type || 'other',
    event_date: event.event_date ?? '',
    start_time: toTimeInput(event.start_time),
    end_time: toTimeInput(event.end_time),
    venue_name: event.venue_name ?? '',
    address: event.address ?? '',
    city: event.city ?? '',
    state: event.state ?? '',
    country: event.country ?? '',
    guest_limit: event.guest_limit != null ? String(event.guest_limit) : '',
    description: event.description ?? '',
    allow_rsvp: event.allow_rsvp,
    allow_plus_one: event.allow_plus_one,
    access_pass_enabled: event.access_pass_enabled !== false,
    allow_maybe_rsvp: Boolean(event.allow_maybe_rsvp),
    fast_scan_enabled: Boolean(event.fast_scan_enabled),
    status: event.status,
  }
}

export function formValuesToWriteInput(
  values: EventFormValues,
  timezone = browserTimezone(),
): EventWriteInput {
  const parsedLimit = values.guest_limit.trim() ? Number(values.guest_limit) : null

  return {
    name: values.name,
    event_type: values.event_type,
    description: values.description,
    event_date: values.event_date,
    start_time: values.start_time,
    end_time: values.end_time,
    venue_name: values.venue_name,
    address: values.address,
    city: values.city,
    state: values.state,
    country: values.country,
    timezone,
    guest_limit: parsedLimit !== null && Number.isFinite(parsedLimit) ? parsedLimit : null,
    allow_rsvp: values.allow_rsvp,
    allow_plus_one: values.allow_plus_one,
    access_pass_enabled: values.access_pass_enabled,
    allow_maybe_rsvp: values.allow_maybe_rsvp,
    fast_scan_enabled: values.fast_scan_enabled,
  }
}

export function statusFromForm(value: string): EventStatus {
  const match = EVENT_STATUSES.find((item) => item.value === value)
  return (match?.value ?? 'draft') as EventStatus
}
