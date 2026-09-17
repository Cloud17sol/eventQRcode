import { Ticket } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { ConfigNotice } from '@/components/common/ConfigNotice'
import { EmptyState } from '@/components/common/EmptyState'
import { EventCard } from '@/components/events/EventCard'
import { useAuth } from '@/hooks/useAuth'
import { useEvents } from '@/hooks/useEvent'
import type { Event } from '@/types/database'

function isPast(event: Event): boolean {
  if (['completed', 'archived', 'cancelled'].includes(event.status)) return true
  if (!event.event_date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${event.event_date}T00:00:00`) < today
}

function groupEvents(events: Event[]) {
  const drafts: Event[] = []
  const upcoming: Event[] = []
  const past: Event[] = []

  for (const event of events) {
    if (event.status === 'draft') drafts.push(event)
    else if (isPast(event)) past.push(event)
    else upcoming.push(event)
  }

  return { drafts, upcoming, past }
}

function EventGroup({ title, events }: { title: string; events: Event[] }) {
  if (events.length === 0) return null

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted">{events.length}</p>
      </div>
      <div className="grid gap-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}

export function DashboardPage() {
  const { profile, user } = useAuth()
  const { data: events = [], isLoading, isError, error } = useEvents()
  const firstName = profile?.full_name?.trim().split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const groups = groupEvents(events)

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">Home</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Hello, {firstName}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Events you organize and events you are assigned to scan both appear here.
          </p>
        </div>
        <Button to="/events/new">Create event</Button>
      </div>

      <div className="mt-6">
        <ConfigNotice />
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-3">
          <div className="h-32 animate-pulse rounded-2xl bg-line/70" />
          <div className="h-32 animate-pulse rounded-2xl bg-line/70" />
        </div>
      ) : isError ? (
        <p className="mt-8 text-sm text-danger">{error instanceof Error ? error.message : 'Could not load events.'}</p>
      ) : events.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Ticket className="h-6 w-6" />}
            title="No events yet"
            body="Create your first event, or wait for an organizer to assign you as door staff."
            actionTo="/events/new"
            actionLabel="Create event"
          />
        </div>
      ) : (
        <>
          <EventGroup title="Upcoming" events={groups.upcoming} />
          <EventGroup title="Drafts" events={groups.drafts} />
          <EventGroup title="Past" events={groups.past} />
        </>
      )}
    </div>
  )
}
