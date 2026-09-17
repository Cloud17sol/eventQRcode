import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ban, Copy, Mail, QrCode, RotateCcw, Ticket } from 'lucide-react'
import toast from 'react-hot-toast'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Field'
import { useGuests } from '@/hooks/useGuests'
import { useEventInvitations } from '@/hooks/useInvitations'
import {
  getOrganizerInviteToken,
  issueMissingInvitations,
  markInvitationShared,
  setInvitationStatus,
} from '@/services/invitationService'
import type { Event, EventInvitation } from '@/types/database'
import { INVITATION_STATUS_LABEL, invitationUrl, RSVP_STATUS_LABEL } from '@/types/invitation'
import { formatEventWhen } from '@/utils/dates'
import { downloadDataUrl, passPngDataUrl } from '@/utils/qr'

const PAGE_SIZE = 20

function shareMessage(eventName: string, url: string) {
  return `You're invited to ${eventName}. Open your invitation: ${url}`
}

async function resolveInviteUrl(invitationId: string) {
  const token = await getOrganizerInviteToken(invitationId)
  return invitationUrl(token)
}

export function InvitationsPage() {
  const event = useOutletContext<Event>()
  const queryClient = useQueryClient()
  const { data: guests = [] } = useGuests(event.id)
  const { data: invitations = [], isLoading, isError, error } = useEventInvitations(event.id)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const missingCount = guests.filter((guest) => !invitations.some((item) => item.guest_id === guest.id)).length

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return invitations.filter((item) => {
      const matchesStatus = status === 'all' || item.status === status
      const haystack = [item.guest_name, item.invitation_number, RSVP_STATUS_LABEL[item.rsvp_status]].join(' ').toLowerCase()
      return matchesStatus && (needle.length === 0 || haystack.includes(needle))
    })
  }, [invitations, query, status])

  useEffect(() => {
    setPage(0)
  }, [query, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const to = Math.min(filtered.length, currentPage * PAGE_SIZE + PAGE_SIZE)

  const issueMissing = useMutation({
    mutationFn: () => issueMissingInvitations(event.id),
    onSuccess: async (count) => {
      await queryClient.invalidateQueries({ queryKey: ['invitations'] })
      toast.success(count === 0 ? 'Every guest already has an invitation' : `Issued ${count} invitations`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not issue invitations')
    },
  })

  async function withInvite(invitation: EventInvitation, fn: () => Promise<void>) {
    setBusyId(invitation.invitation_id)
    try {
      await fn()
      await queryClient.invalidateQueries({ queryKey: ['invitations'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invitation action failed')
    } finally {
      setBusyId(null)
    }
  }

  async function copyLink(invitation: EventInvitation) {
    await withInvite(invitation, async () => {
      const url = await resolveInviteUrl(invitation.invitation_id)
      await navigator.clipboard.writeText(url)
      await markInvitationShared(invitation.invitation_id, 'copy')
      toast.success('Invitation link copied')
    })
  }

  async function shareWhatsApp(invitation: EventInvitation) {
    await withInvite(invitation, async () => {
      const url = await resolveInviteUrl(invitation.invitation_id)
      await markInvitationShared(invitation.invitation_id, 'whatsapp')
      window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage(event.name, url))}`, '_blank', 'noopener,noreferrer')
    })
  }

  async function shareEmail(invitation: EventInvitation) {
    await withInvite(invitation, async () => {
      const url = await resolveInviteUrl(invitation.invitation_id)
      await markInvitationShared(invitation.invitation_id, 'email')
      const subject = encodeURIComponent(`Invitation to ${event.name}`)
      const body = encodeURIComponent(shareMessage(event.name, url))
      window.location.href = `mailto:?subject=${subject}&body=${body}`
    })
  }

  async function downloadQr(invitation: EventInvitation) {
    await withInvite(invitation, async () => {
      const url = await resolveInviteUrl(invitation.invitation_id)
      const venue = [event.venue_name, event.address, event.city, event.state, event.country]
        .filter(Boolean)
        .join(', ')
      const guest = guests.find((item) => item.id === invitation.guest_id)
      const dataUrl = await passPngDataUrl(
        {
          guestName: invitation.guest_name,
          eventName: event.name,
          when: formatEventWhen(event.event_date, event.start_time, event.end_time),
          venue,
          invitationNumber: invitation.invitation_number,
          tableName: guest?.table_name,
        },
        url,
      )
      downloadDataUrl(dataUrl, `${invitation.invitation_number}-pass.png`)
      toast.success('Access pass downloaded')
    })
  }

  async function toggleStatus(invitation: EventInvitation) {
    const next = invitation.status === 'active' ? 'revoked' : 'active'
    await withInvite(invitation, async () => {
      await setInvitationStatus(invitation.invitation_id, next)
      toast.success(next === 'revoked' ? 'Invitation revoked' : 'Invitation restored')
    })
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Invitations</h2>
          <p className="mt-1 text-sm text-muted">
            {invitations.length} issued
            {missingCount > 0 ? ` · ${missingCount} guests still need one` : ''}. Links stay closed until the event is published.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {missingCount > 0 ? (
            <Button disabled={issueMissing.isPending} onClick={() => issueMissing.mutate()}>
              {issueMissing.isPending ? 'Issuing…' : `Issue ${missingCount} missing`}
            </Button>
          ) : guests.length > 0 ? (
            <Button variant="secondary" disabled={issueMissing.isPending} onClick={() => issueMissing.mutate()}>
              {issueMissing.isPending ? 'Checking…' : 'Issue missing'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="sr-only" htmlFor="invite-search">
          Search invitations
        </label>
        <Input
          id="invite-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search guest or invitation number"
        />
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'revoked'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                status === item ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line hover:text-copy'
              }`}
            >
              {item === 'all' ? 'All' : INVITATION_STATUS_LABEL[item]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-line/70" />
      ) : isError ? (
        <p className="text-sm text-danger">{error instanceof Error ? error.message : 'Could not load invitations.'}</p>
      ) : guests.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-6 w-6" />}
          title="Add guests first"
          body="Invitations are issued when you add or import guests."
          actionTo={`/events/${event.id}/guests/new`}
          actionLabel="Add guest"
        />
      ) : invitations.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title="No invitations yet"
          body="Use Issue missing above to create invitations for guests already on this list."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching invitations" body="Try another search or status filter." />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {rows.map((invitation) => (
              <article key={invitation.invitation_id} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-copy">{invitation.guest_name}</p>
                    <p className="mt-1 text-xs text-muted">{invitation.invitation_number}</p>
                  </div>
                  <span className="text-xs font-medium text-muted">{INVITATION_STATUS_LABEL[invitation.status]}</span>
                </div>
                <p className="mt-3 text-sm text-muted">{RSVP_STATUS_LABEL[invitation.rsvp_status]}</p>
                <InviteActions
                  invitation={invitation}
                  busy={busyId === invitation.invitation_id}
                  onCopy={() => void copyLink(invitation)}
                  onWhatsApp={() => void shareWhatsApp(invitation)}
                  onEmail={() => void shareEmail(invitation)}
                  onQr={() => void downloadQr(invitation)}
                  onToggle={() => void toggleStatus(invitation)}
                />
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-line bg-card md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-line text-xs font-medium text-muted">
                <tr>
                  <th className="px-3 py-3 lg:px-4">Guest</th>
                  <th className="px-3 py-3 lg:px-4">Invitation</th>
                  <th className="px-3 py-3 lg:px-4">Status</th>
                  <th className="px-3 py-3 lg:px-4">RSVP</th>
                  <th className="hidden px-3 py-3 lg:table-cell lg:px-4">Opened</th>
                  <th className="hidden px-3 py-3 lg:table-cell lg:px-4">Shared</th>
                  <th className="w-48 px-2 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((invitation) => (
                  <tr key={invitation.invitation_id} className="text-copy">
                    <td className="truncate px-3 py-3 font-medium lg:px-4">{invitation.guest_name}</td>
                    <td className="truncate px-3 py-3 text-muted lg:px-4">{invitation.invitation_number}</td>
                    <td className="truncate px-3 py-3 lg:px-4">{INVITATION_STATUS_LABEL[invitation.status]}</td>
                    <td className="truncate px-3 py-3 lg:px-4">{RSVP_STATUS_LABEL[invitation.rsvp_status]}</td>
                    <td className="hidden truncate px-3 py-3 text-muted lg:table-cell lg:px-4">{invitation.opened_at ? 'Yes' : '—'}</td>
                    <td className="hidden truncate px-3 py-3 text-muted lg:table-cell lg:px-4">{invitation.delivery_method || '—'}</td>
                    <td className="px-2 py-2">
                      <InviteActions
                        invitation={invitation}
                        busy={busyId === invitation.invitation_id}
                        compact
                        onCopy={() => void copyLink(invitation)}
                        onWhatsApp={() => void shareWhatsApp(invitation)}
                        onEmail={() => void shareEmail(invitation)}
                        onQr={() => void downloadQr(invitation)}
                        onToggle={() => void toggleStatus(invitation)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-sm text-muted">
              {from}–{to} of {filtered.length}
            </p>
            {pageCount > 1 ? (
              <div className="flex gap-2">
                <Button variant="secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

const iconActionClass =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-paper hover:text-copy disabled:cursor-not-allowed disabled:opacity-40'

function InviteActions({
  invitation,
  busy,
  compact,
  onCopy,
  onWhatsApp,
  onEmail,
  onQr,
  onToggle,
}: {
  invitation: EventInvitation
  busy: boolean
  compact?: boolean
  onCopy: () => void
  onWhatsApp: () => void
  onEmail: () => void
  onQr: () => void
  onToggle: () => void
}) {
  const restore = invitation.status !== 'active'
  return (
    <div className={`flex items-center gap-0.5 ${compact ? 'justify-end' : 'mt-4'}`}>
      <button
        type="button"
        aria-label="Copy invitation link"
        title="Copy link"
        className={`${iconActionClass} text-admit hover:text-admit`}
        disabled={busy}
        onClick={onCopy}
      >
        <Copy className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Share on WhatsApp"
        title="WhatsApp"
        className={iconActionClass}
        disabled={busy}
        onClick={onWhatsApp}
      >
        <WhatsAppIcon />
      </button>
      <button
        type="button"
        aria-label="Share by email"
        title="Email"
        className={iconActionClass}
        disabled={busy}
        onClick={onEmail}
      >
        <Mail className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Download access pass"
        title="Pass"
        className={iconActionClass}
        disabled={busy}
        onClick={onQr}
      >
        <QrCode className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={restore ? 'Restore invitation' : 'Revoke invitation'}
        title={restore ? 'Restore' : 'Revoke'}
        className={`${iconActionClass} ${restore ? 'text-admit hover:text-admit' : 'hover:text-danger'}`}
        disabled={busy}
        onClick={onToggle}
      >
        {restore ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
      </button>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
