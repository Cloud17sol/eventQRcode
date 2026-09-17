import { useMemo, useState } from 'react'
import { Ticket } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Field'
import { EventCard } from '@/components/events/EventCard'
import { useEvents } from '@/hooks/useEvent'
import { EVENT_STATUS_LABEL } from '@/types/event'

const filters = ['all', 'draft', 'published', 'active', 'completed'] as const

export function EventListPage() {
  const { data: events = [], isLoading, isError, error } = useEvents()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<(typeof filters)[number]>('all')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return events.filter((event) => {
      const matchesStatus = status === 'all' || event.status === status
      const haystack = [event.name, event.venue_name, event.city, event.event_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesQuery = needle.length === 0 || haystack.includes(needle)
      return matchesStatus && matchesQuery
    })
  }, [events, query, status])

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">All events</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Events</h1>
        </div>
        <Button to="/events/new">Create event</Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="event-search">
          Search events
        </label>
        <Input
          id="event-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, venue, or city"
          className="sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors duration-200 ${
                status === item ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line hover:text-copy'
              }`}
            >
              {item === 'all' ? 'All' : EVENT_STATUS_LABEL[item]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-3">
          <div className="h-32 animate-pulse rounded-2xl bg-line/70" />
          <div className="h-32 animate-pulse rounded-2xl bg-line/70" />
        </div>
      ) : isError ? (
        <p className="mt-8 text-sm text-danger">{error instanceof Error ? error.message : 'Could not load events.'}</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Ticket className="h-6 w-6" />}
            title={events.length === 0 ? 'No events yet' : 'No matching events'}
            body={
              events.length === 0
                ? 'Create an event to start the guest and access workflow.'
                : 'Try another search or status filter.'
            }
            actionTo={events.length === 0 ? '/events/new' : undefined}
            actionLabel={events.length === 0 ? 'Create event' : undefined}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-3">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
