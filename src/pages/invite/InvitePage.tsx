import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useParams } from 'react-router-dom'
import { AccessPass } from '@/components/invite/AccessPass'
import { Button } from '@/components/common/Button'
import { ConfigNotice } from '@/components/common/ConfigNotice'
import { Logo } from '@/components/common/Logo'
import { useOpenInvitation } from '@/hooks/useInvitations'
import { isSupabaseConfigured } from '@/lib/supabase'
import { submitRsvp } from '@/services/invitationService'
import type { RsvpStatus } from '@/types/database'
import { invitationUrl, RSVP_STATUS_LABEL } from '@/types/invitation'
import { formatEventWhen } from '@/utils/dates'
import { downloadDataUrl, passPngDataUrl } from '@/utils/qr'

const CLOSED_COPY: Record<string, { title: string; body: string }> = {
  unknown: {
    title: 'Invitation not found',
    body: 'This link is invalid or the invitation no longer exists.',
  },
  revoked: {
    title: 'This invitation has been revoked',
    body: 'Please contact the organizer if you think this is a mistake.',
  },
  expired: {
    title: 'This invitation is no longer valid',
    body: 'It may have expired or been cancelled.',
  },
  unavailable: {
    title: 'Invitation not available yet',
    body: 'The organizer has not published this event.',
  },
  event_cancelled: {
    title: 'This event has been cancelled',
    body: 'The organizer cancelled the event attached to this invitation.',
  },
}

export function InvitePage() {
  const { inviteToken } = useParams()
  const token = inviteToken ? decodeURIComponent(inviteToken) : ''
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useOpenInvitation(token || undefined)
  const [count, setCount] = useState(1)
  const [message, setMessage] = useState('')
  const [savingPass, setSavingPass] = useState(false)

  useEffect(() => {
    if (data?.rsvp_status === 'attending' && data.attending_count) {
      setCount(data.attending_count)
    } else if (data?.guest_limit) {
      setCount(1)
    }
    setMessage(data?.rsvp_message ?? '')
  }, [data?.attending_count, data?.guest_limit, data?.rsvp_message, data?.rsvp_status])

  const rsvp = useMutation({
    mutationFn: (status: Exclude<RsvpStatus, 'pending'>) =>
      submitRsvp(token, status, status === 'not_attending' ? 0 : count, message),
    onSuccess: async (result) => {
      if (result.status !== 'ok') {
        toast.error(rsvpError(result.status))
        return
      }
      await queryClient.setQueryData(['open-invitation', token], result)
      toast.success('Response saved')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not save RSVP')
    },
  })

  const venue = useMemo(() => {
    if (!data) return ''
    return [data.venue_name, data.address, data.city, data.state, data.country].filter(Boolean).join(', ')
  }, [data])

  const mapsUrl = venue ? `https://maps.google.com/?q=${encodeURIComponent(venue)}` : null

  if (!isSupabaseConfigured) {
    return (
      <InviteShell>
        <ConfigNotice />
      </InviteShell>
    )
  }

  if (isLoading) {
    return (
      <InviteShell>
        <div className="h-80 animate-pulse rounded-2xl bg-line/70" />
      </InviteShell>
    )
  }

  if (isError) {
    return (
      <InviteShell>
        <ClosedCard
          title="Unable to open invitation"
          body={error instanceof Error ? error.message : 'Try this link again in a moment.'}
        />
      </InviteShell>
    )
  }

  const closed = data?.status ? CLOSED_COPY[data.status] : null
  if (!data || closed) {
    return (
      <InviteShell>
        <ClosedCard title={closed?.title ?? 'Invitation not found'} body={closed?.body ?? ''} />
      </InviteShell>
    )
  }

  const limit = data.guest_limit ?? 1
  const canRsvp = Boolean(data.allow_rsvp)
  const current = data.rsvp_status ?? 'pending'
  const passDetails = {
    guestName: data.guest_name ?? 'Guest',
    eventName: data.event_name ?? 'Event',
    when: formatEventWhen(data.event_date, data.start_time, data.end_time),
    venue,
    invitationNumber: data.invitation_number ?? '',
    category: data.category,
    tableName: data.table_name,
  }

  async function savePass() {
    setSavingPass(true)
    try {
      const dataUrl = await passPngDataUrl(passDetails, invitationUrl(token))
      downloadDataUrl(dataUrl, `${passDetails.invitationNumber || 'access-pass'}.png`)
      toast.success('Access pass saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the access pass')
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <InviteShell>
      <article className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_16px_40px_-28px_rgba(18,26,34,0.5)]">
        {data.cover_image_url ? (
          <img src={data.cover_image_url} alt="" className="h-40 w-full object-cover sm:h-52" />
        ) : (
          <div className="bg-ink px-6 py-8 text-white">
            <p className="text-xs font-medium tracking-[0.18em] text-white/55 uppercase">You're invited</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{data.event_name}</h1>
          </div>
        )}

        <div className="ticket-stub px-6 py-6 sm:px-8">
          {data.cover_image_url ? (
            <>
              <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">You're invited</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{data.event_name}</h1>
            </>
          ) : null}

          <p className="mt-4 text-lg font-semibold text-copy">{data.guest_name}</p>
          <p className="mt-1 text-sm text-muted">{data.invitation_number}</p>

          <dl className="mt-6 grid gap-4 text-sm">
            <div>
              <dt className="text-muted">When</dt>
              <dd className="mt-1 font-medium text-copy">
                {formatEventWhen(data.event_date, data.start_time, data.end_time)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Where</dt>
              <dd className="mt-1 font-medium text-copy">{venue || 'Venue to be announced'}</dd>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-admit"
                >
                  Open map
                </a>
              ) : null}
            </div>
            {data.category ? (
              <div>
                <dt className="text-muted">Category</dt>
                <dd className="mt-1 font-medium text-copy">{data.category}</dd>
              </div>
            ) : null}
            {data.table_name ? (
              <div>
                <dt className="text-muted">Table</dt>
                <dd className="mt-1 font-medium text-copy">{data.table_name}</dd>
              </div>
            ) : null}
          </dl>

          {data.description ? <p className="mt-6 text-sm leading-6 text-copy">{data.description}</p> : null}

          <section className="mt-8 border-t border-line pt-6">
            <h2 className="text-base font-semibold">RSVP</h2>
            <p className="mt-1 text-sm text-muted">
              {canRsvp
                ? `This invitation admits ${limit} ${limit === 1 ? 'person' : 'people'}.`
                : 'The organizer is not collecting RSVPs for this event.'}
            </p>
            {current !== 'pending' ? (
              <p className="mt-3 text-sm font-medium text-admit">Current response: {RSVP_STATUS_LABEL[current]}</p>
            ) : null}

            {canRsvp ? (
              <form
                className="mt-5 grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  rsvp.mutate('attending')
                }}
              >
                {limit > 1 ? (
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-copy">How many will attend?</span>
                    <select
                      className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm"
                      value={count}
                      onChange={(event) => setCount(Number(event.target.value))}
                    >
                      {Array.from({ length: limit }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-copy">Note to organizer</span>
                  <textarea
                    className="min-h-20 w-full resize-y rounded-lg border border-line bg-card px-3 py-2.5 text-sm"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={500}
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button type="submit" disabled={rsvp.isPending}>
                    {rsvp.isPending ? 'Saving…' : 'Attending'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={rsvp.isPending}
                    onClick={() => rsvp.mutate('not_attending')}
                  >
                    Decline
                  </Button>
                </div>
                {data.allow_maybe_rsvp ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted"
                    disabled={rsvp.isPending}
                    onClick={() => rsvp.mutate('maybe')}
                  >
                    Maybe
                  </Button>
                ) : null}
              </form>
            ) : null}
          </section>

          {data.access_pass_enabled ? (
            <section className="mt-8 border-t border-line pt-6">
              <h2 className="text-base font-semibold">Access pass</h2>
              <p className="mt-1 text-sm text-muted">Show this at the door. Do not screenshot someone else’s pass.</p>
              <div className="mt-5">
                <AccessPass details={passDetails} credentialUrl={invitationUrl(token)} />
              </div>
              <Button type="button" variant="secondary" fullWidth className="mt-4" disabled={savingPass} onClick={() => void savePass()}>
                {savingPass ? 'Saving…' : 'Save pass'}
              </Button>
            </section>
          ) : null}
        </div>
      </article>
    </InviteShell>
  )
}

function InviteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  )
}

function ClosedCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-6 py-10 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
    </div>
  )
}

function rsvpError(status: string) {
  if (status === 'rsvp_closed') return 'RSVP is closed for this event.'
  if (status === 'invalid_count') return 'Choose a guest count within your allowance.'
  if (status === 'invalid_rsvp') return 'That response is not allowed.'
  return 'Could not save RSVP.'
}
