import { Link } from 'react-router-dom'
import { StatusStamp } from '@/components/events/StatusStamp'
import type { Event } from '@/types/database'
import { eventTypeLabel } from '@/types/event'
import { formatEventWhen } from '@/utils/dates'

type EventCardProps = {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const venue = [event.venue_name, event.city].filter(Boolean).join(' · ')

  return (
    <Link
      to={`/events/${event.id}`}
      className="ticket-stub group relative block overflow-hidden rounded-2xl border border-line bg-card pl-5 shadow-[0_8px_24px_-18px_rgba(18,26,34,0.45)] transition-colors duration-200 hover:border-copy/25"
    >
      <span className="ticket-perf pointer-events-none absolute inset-y-4 left-[18px] w-px" aria-hidden="true" />
      <div className="flex min-h-[132px] flex-col justify-between gap-6 py-5 pr-5 pl-6 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted">{eventTypeLabel(event.event_type)}</p>
          <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-copy">{event.name}</h3>
          <p className="mt-2 text-sm text-muted">{formatEventWhen(event.event_date, event.start_time, event.end_time)}</p>
          <p className="mt-1 truncate text-sm text-copy/80">{venue || 'Venue to be set'}</p>
        </div>
        <StatusStamp status={event.status} tilt />
      </div>
    </Link>
  )
}
