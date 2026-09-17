import { NavLink, Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { StatusStamp } from '@/components/events/StatusStamp'
import { useEvent } from '@/hooks/useEvent'
import { useEventAccess } from '@/hooks/useStaff'
import { eventTypeLabel } from '@/types/event'
import { formatEventWhen } from '@/utils/dates'

export function EventLayout() {
  const { eventId } = useParams()
  const { pathname } = useLocation()
  const { data: event, isLoading, isError, error } = useEvent(eventId)
  const { data: access } = useEventAccess(eventId)

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-line/70" />
  }

  if (isError || !event) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Event not found</h1>
        <p className="mt-2 text-sm text-danger">
          {error instanceof Error ? error.message : 'This event is missing or you do not have access.'}
        </p>
        <div className="mt-6">
          <Button to="/events" variant="secondary">
            Back to events
          </Button>
        </div>
      </div>
    )
  }

  const venue = [event.venue_name, event.city].filter(Boolean).join(' · ')
  const canManage = access?.can_manage ?? false
  const accessReady = Boolean(access)
  const showScanner =
    event.status === 'active' && (access ? access.can_scan || access.can_manual_checkin : true)

  if (
    accessReady &&
    !canManage &&
    /\/(guests|invitations|settings|staff|gates)(\/|$)/.test(pathname)
  ) {
    return <Navigate to={`/events/${event.id}/overview`} replace />
  }

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
      isActive ? 'border-ink text-copy' : 'border-transparent text-muted hover:text-copy'
    }`

  return (
    <div>
      <p className="text-sm text-muted">{eventTypeLabel(event.event_type)}</p>
      <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{event.name}</h1>
            <StatusStamp status={event.status} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {formatEventWhen(event.event_date, event.start_time, event.end_time)}
            {venue ? ` · ${venue}` : ''}
          </p>
        </div>
        {showScanner ? (
          <Button to={`/scan/${event.id}`} className="w-full sm:w-auto">
            Open scanner
          </Button>
        ) : null}
      </div>

      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-line"
        aria-label="Event"
      >
        <NavLink to={`/events/${event.id}/overview`} className={tabClass}>
          Overview
        </NavLink>
        {canManage || !accessReady ? (
          <>
            <NavLink to={`/events/${event.id}/guests`} className={tabClass}>
              Guests
            </NavLink>
            <NavLink to={`/events/${event.id}/invitations`} className={tabClass}>
              Invitations
            </NavLink>
            <NavLink to={`/events/${event.id}/gates`} className={tabClass}>
              Gates
            </NavLink>
          </>
        ) : null}
        <NavLink to={`/events/${event.id}/check-ins`} className={tabClass}>
          Check-ins
        </NavLink>
        {canManage || !accessReady ? (
          <>
            <NavLink to={`/events/${event.id}/staff`} className={tabClass}>
              Staff
            </NavLink>
            <NavLink to={`/events/${event.id}/settings`} className={tabClass}>
              Settings
            </NavLink>
          </>
        ) : null}
      </nav>

      <div className="pt-8">
        <Outlet context={event} />
      </div>
    </div>
  )
}
