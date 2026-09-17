import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { useEventDashboard } from '@/hooks/useDashboard'
import { useEventAccess } from '@/hooks/useStaff'
import { updateEvent } from '@/services/eventService'
import type { Event } from '@/types/database'
import { EVENT_STATUSES } from '@/types/event'
import { STAFF_ROLE_LABEL } from '@/types/staff'
import { eventToFormValues, formValuesToWriteInput } from '@/utils/eventForm'

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 bg-card px-3 py-3 sm:px-5 sm:py-4">
      <p className="text-[11px] font-medium text-muted sm:text-xs">{label}</p>
      <p className="mt-1 font-sans text-2xl font-semibold tracking-tight text-copy sm:mt-2 sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-muted sm:mt-1 sm:text-xs sm:leading-normal">{hint}</p>
    </div>
  )
}

export function EventOverviewPage() {
  const event = useOutletContext<Event>()
  const queryClient = useQueryClient()
  const { data: access } = useEventAccess(event.id)
  const canManage = access?.can_manage !== false
  const { data: dashboard, isError, error } = useEventDashboard(event.id, true)
  const invited = dashboard?.invited ?? 0
  const expected = dashboard?.expected ?? 0
  const checkedIn = dashboard?.checked_in ?? 0
  const remaining = dashboard?.remaining ?? 0
  const percent = dashboard?.check_in_percent ?? 0
  const gates = dashboard?.gates ?? []
  const canDoor = Boolean(access?.can_scan || access?.can_manual_checkin)
  const statusHelp = EVENT_STATUSES.find((item) => item.value === event.status)?.help
  const venue = [event.venue_name, event.address, event.city, event.state, event.country]
    .filter(Boolean)
    .join(', ')
  const hasVip = Boolean(dashboard && (dashboard.vip_expected > 0 || dashboard.vip_checked_in > 0))

  const publish = useMutation({
    mutationFn: () =>
      updateEvent(event.id, {
        ...formValuesToWriteInput(eventToFormValues(event), event.timezone ?? undefined),
        status: 'published',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event published')
    },
    onError: (publishError) => {
      toast.error(publishError instanceof Error ? publishError.message : 'Could not publish event')
    },
  })

  const openDoor = useMutation({
    mutationFn: () =>
      updateEvent(event.id, {
        ...formValuesToWriteInput(eventToFormValues(event), event.timezone ?? undefined),
        status: 'active',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Door is open')
    },
    onError: (doorError) => {
      toast.error(doorError instanceof Error ? doorError.message : 'Could not open the door')
    },
  })

  return (
    <div className="grid gap-8">
      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          <Metric label="Invited" value={String(invited)} hint={invited === 0 ? 'No guests yet' : 'Active guest records'} />
          <Metric label="Expected" value={String(expected)} hint="From guest allowances" />
          <Metric
            label="Checked in"
            value={String(checkedIn)}
            hint={expected === 0 ? 'Waiting on the list' : `${percent}% of expected`}
          />
          <Metric
            label="Remaining"
            value={expected === 0 ? '—' : String(remaining)}
            hint={event.guest_limit ? `Cap ${event.guest_limit}` : 'No cap set'}
          />
        </div>
        <p className="flex items-center gap-2 border-t border-line px-3 py-2.5 text-xs text-muted sm:px-5 sm:py-3 sm:text-sm">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-admit" aria-hidden="true" />
          Live ledger. Admits from every gate land here as they happen.
        </p>
        {isError ? (
          <p className="border-t border-line px-5 py-3 text-sm text-danger">
            {error instanceof Error ? error.message : 'Could not load live totals.'}
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 rounded-2xl border border-line bg-card px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-base font-semibold">Event details</h2>
          <p className="mt-1 text-sm text-muted">{statusHelp}</p>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Venue</dt>
            <dd className="mt-1 font-medium text-copy">{venue || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-muted">Timezone</dt>
            <dd className="mt-1 font-medium text-copy">{event.timezone || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-muted">RSVP</dt>
            <dd className="mt-1 font-medium text-copy">{event.allow_rsvp ? 'Enabled' : 'Off'}</dd>
          </div>
          <div>
            <dt className="text-muted">Plus-ones</dt>
            <dd className="mt-1 font-medium text-copy">
              {event.allow_plus_one ? 'Allowed by default' : 'Off by default'}
            </dd>
          </div>
        </dl>
        {event.description ? (
          <p className="text-sm leading-6 text-copy">{event.description}</p>
        ) : null}
        {canManage && event.status === 'draft' ? (
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">Publish when the event details are ready. Invitation links stay closed until then.</p>
            <Button disabled={publish.isPending} onClick={() => publish.mutate()}>
              {publish.isPending ? 'Publishing…' : 'Publish event'}
            </Button>
          </div>
        ) : null}
        {canManage && event.status === 'published' ? (
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">Open the door when staff are ready to scan. Invitation links already work.</p>
            <Button disabled={openDoor.isPending} onClick={() => openDoor.mutate()}>
              {openDoor.isPending ? 'Opening…' : 'Open the door'}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="grid gap-0 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        <div className="px-5 py-4 sm:px-6">
          <p className="text-sm font-medium text-copy">RSVP</p>
          <p className="mt-1 text-sm text-muted">
            Attending {dashboard?.rsvp_attending ?? 0}
            {event.allow_maybe_rsvp ? ` · Maybe ${dashboard?.rsvp_maybe ?? 0}` : ''}
            {' · '}Declined {dashboard?.rsvp_declined ?? 0}
            {' · '}No response {dashboard?.rsvp_pending ?? 0}
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-sm font-medium text-copy">VIP and general</p>
          <p className="mt-1 text-sm text-muted">
            {hasVip
              ? `VIP ${dashboard?.vip_checked_in ?? 0} of ${dashboard?.vip_expected ?? 0} · General ${dashboard?.general_checked_in ?? 0} of ${dashboard?.general_expected ?? 0}`
              : 'Name a guest category VIP to split attendance. Everyone else counts as general.'}
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-sm font-medium text-copy">Gate activity</p>
          {gates.length === 0 ? (
            <p className="mt-1 text-sm text-muted">No gates yet.</p>
          ) : (
            <ul className="mt-2 grid gap-1.5 text-sm">
              {gates.map((gate) => (
                <li key={gate.id} className="flex items-baseline justify-between gap-4">
                  <span className={gate.is_active ? 'text-copy' : 'text-muted'}>
                    {gate.name}
                    {gate.is_active ? '' : ' · closed'}
                  </span>
                  <span className="font-medium text-copy">{gate.checked_in}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-sm font-medium text-copy">Staff</p>
          <p className="mt-1 text-sm text-muted">
            {canManage
              ? 'Assign scanners from the Staff tab.'
              : `You are assigned as ${STAFF_ROLE_LABEL[access?.role ?? ''] ?? access?.role ?? 'staff'}.`}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {canManage ? (
          <>
            <Button to={`/events/${event.id}/guests`}>Open guest list</Button>
            <Button to={`/events/${event.id}/invitations`} variant="secondary">
              Open invitations
            </Button>
            <Button to={`/events/${event.id}/staff`} variant="secondary">
              Manage staff
            </Button>
          </>
        ) : null}
        {event.status === 'active' && (canDoor || canManage) ? (
          <Button to={`/scan/${event.id}`}>Open scanner</Button>
        ) : canManage ? (
          <Button to={`/events/${event.id}/gates`} variant="secondary">
            Manage gates
          </Button>
        ) : null}
        {canManage ? (
          <Button to={`/events/${event.id}/settings`} variant="secondary">
            Edit event settings
          </Button>
        ) : null}
      </div>
    </div>
  )
}
