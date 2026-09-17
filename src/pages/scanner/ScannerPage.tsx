import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { InstallHint } from '@/components/scanner/InstallHint'
import { ManualSearch } from '@/components/scanner/ManualSearch'
import { QrCamera } from '@/components/scanner/QrCamera'
import { useAdmissionSummary, useGates } from '@/hooks/useCheckIns'
import { useEventLive } from '@/hooks/useDashboard'
import { useEvent } from '@/hooks/useEvent'
import { useEventAccess } from '@/hooks/useStaff'
import { checkInGuest, validateEventCredential } from '@/services/checkInService'
import type { CheckInResult, CredentialResult } from '@/types/database'
import { CREDENTIAL_STATUS_COPY, gateStorageKey } from '@/types/scanner'
import { parseInviteCredential } from '@/utils/credential'
import { scanFeedback } from '@/utils/scanFeedback'

type Overlay =
  | { kind: 'result'; result: CredentialResult }
  | { kind: 'admitted'; result: CheckInResult }
  | { kind: 'error'; message: string }

export function ScannerPage() {
  const { eventId } = useParams()
  const queryClient = useQueryClient()
  const { data: event, isLoading, isError, error } = useEvent(eventId)
  const { data: access } = useEventAccess(eventId)
  const { data: gates = [] } = useGates(eventId)
  const { data: summary } = useAdmissionSummary(eventId)
  useEventLive(eventId)
  const activeGates = gates.filter((gate) => gate.is_active)
  const [gateId, setGateId] = useState('')
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const lastScan = useRef('')
  const canScan = access?.can_scan !== false
  const canManual = access?.can_manual_checkin !== false

  useEffect(() => {
    if (access && !access.can_scan && access.can_manual_checkin) {
      setMode('manual')
    }
  }, [access])

  useEffect(() => {
    if (!eventId) return
    const stored = sessionStorage.getItem(gateStorageKey(eventId))
    if (stored) setGateId(stored)
  }, [eventId])

  useEffect(() => {
    if (!gateId && activeGates[0]) setGateId(activeGates[0].id)
  }, [activeGates, gateId])

  const selectedGate = activeGates.find((gate) => gate.id === gateId) ?? null

  const admit = useMutation({
    mutationFn: (input: { invitationId: string; quantity: number; method: 'qr' | 'manual' }) =>
      checkInGuest(eventId as string, input.invitationId, input.quantity, gateId, input.method),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['admission-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['admissions'] })
      await queryClient.invalidateQueries({ queryKey: ['check-ins'] })
      if (!result.ok) {
        scanFeedback('warn')
        setOverlay({ kind: 'result', result: { valid: false, ...result } })
        return
      }
      scanFeedback('ok')
      setOverlay({ kind: 'admitted', result })
    },
    onError: (err) => {
      scanFeedback('warn')
      setOverlay({
        kind: 'error',
        message: err instanceof Error ? err.message : 'We could not complete the check-in. No entry has been recorded.',
      })
    },
  })

  async function onDecode(raw: string) {
    if (overlay || admit.isPending) return
    const token = parseInviteCredential(raw)
    if (!token) {
      if (lastScan.current === raw) return
      lastScan.current = raw
      scanFeedback('warn')
      setOverlay({ kind: 'result', result: { valid: false, status: 'unknown' } })
      return
    }
    if (lastScan.current === token) return
    lastScan.current = token
    if (!eventId || !gateId) {
      setOverlay({ kind: 'result', result: { valid: false, status: 'invalid_gate' } })
      return
    }
    try {
      const result = await validateEventCredential(token, eventId, gateId)
      const ok = result.status === 'valid' || result.status === 'partial'
      scanFeedback(ok ? 'ok' : 'warn')
      setQuantity(1)
      if (result.fast_scan && result.invitation_id && ok) {
        admit.mutate({ invitationId: result.invitation_id, quantity: 1, method: 'qr' })
        return
      }
      setOverlay({ kind: 'result', result })
    } catch (err) {
      scanFeedback('warn')
      setOverlay({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Unable to verify invitation.',
      })
    }
  }

  function resetScanner() {
    lastScan.current = ''
    setOverlay(null)
  }

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink pt-[env(safe-area-inset-top)] text-sm text-white/70">Opening scanner…</div>
    )
  }

  if (isError || !event) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center">
        <p className="text-sm text-white/70">
          {error instanceof Error ? error.message : 'This event is missing or you do not have access.'}
        </p>
        <Link to="/events" className="mt-4 text-sm font-medium text-white">
          Back to events
        </Link>
      </div>
    )
  }

  const remaining = overlay?.kind === 'result' ? overlay.result.remaining ?? 1 : 1
  const canAdmit =
    overlay?.kind === 'result' &&
    overlay.result.invitation_id &&
    (overlay.result.status === 'valid' || overlay.result.status === 'partial')

  return (
    <div className="flex min-h-dvh flex-col bg-ink pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white">
      <header className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-white/50">Scanner</p>
          <h1 className="mt-1 truncate text-lg font-semibold tracking-tight">{event.name}</h1>
          <label className="mt-3 block text-sm text-white/70">
            Gate
            <select
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/8 px-3 py-2 text-sm text-white"
              value={gateId}
              onChange={(eventSelect) => {
                setGateId(eventSelect.target.value)
                if (eventId) sessionStorage.setItem(gateStorageKey(eventId), eventSelect.target.value)
              }}
            >
              {activeGates.length === 0 ? <option value="">No active gate</option> : null}
              {activeGates.map((gate) => (
                <option key={gate.id} value={gate.id} className="text-copy">
                  {gate.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Link to={`/events/${event.id}/overview`} className="shrink-0 text-sm font-medium text-white/70">
          Close
        </Link>
      </header>

      <main className="flex flex-1 flex-col px-4 pb-6 sm:px-6">
        <InstallHint />
        {access && !access.can_scan && !access.can_manual_checkin ? (
          <div className="rounded-2xl border border-white/10 bg-white/6 px-5 py-8 text-center">
            <p className="text-lg font-semibold">Not authorized to scan</p>
            <p className="mt-2 text-sm leading-6 text-white/70">Ask the organizer to assign a scanner role.</p>
          </div>
        ) : event.status !== 'active' ? (
          <div className="rounded-2xl border border-white/10 bg-white/6 px-5 py-8 text-center">
            <p className="text-lg font-semibold">Door is not open</p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              {access?.can_manage
                ? 'Set this event to Door open in settings before scanning.'
                : 'The organizer has not opened the door yet.'}
            </p>
            <div className="mt-5">
              <Button to={access?.can_manage ? `/events/${event.id}/settings` : `/events/${event.id}/overview`} variant="secondary">
                {access?.can_manage ? 'Event settings' : 'Back to event'}
              </Button>
            </div>
          </div>
        ) : !selectedGate ? (
          <div className="rounded-2xl border border-white/10 bg-white/6 px-5 py-8 text-center">
            <p className="text-lg font-semibold">Choose a gate</p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              {access?.can_manage ? 'Add or activate a gate, then return to scan.' : 'Ask the organizer to activate a gate.'}
            </p>
            <div className="mt-5">
              <Button to={access?.can_manage ? `/events/${event.id}/gates` : `/events/${event.id}/overview`} variant="secondary">
                {access?.can_manage ? 'Manage gates' : 'Back to event'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 text-center text-sm text-white/60">
              {mode === 'camera' ? 'Point camera at guest QR' : 'Search by name, phone, or invitation number'}
            </p>
            {mode === 'camera' && canScan ? (
              <QrCamera paused={Boolean(overlay) || admit.isPending} onDecode={(value) => void onDecode(value)} />
            ) : (
              <ManualSearch
                eventId={event.id}
                gateId={gateId}
                onSelect={(result) => {
                  const ok = result.status === 'valid' || result.status === 'partial'
                  scanFeedback(ok ? 'ok' : 'warn')
                  setQuantity(1)
                  setOverlay({ kind: 'result', result })
                }}
              />
            )}
            <p className="mt-4 text-center text-sm text-white/60">
              Today: {summary?.checked_in ?? 0} / {summary?.expected ?? 0} checked in
            </p>
            {canScan && canManual ? (
              <div className="mt-6">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setMode((current) => (current === 'camera' ? 'manual' : 'camera'))}
                >
                  {mode === 'camera' ? 'Manual check-in' : 'Back to camera'}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </main>

      {overlay ? (
        <div className="fixed inset-0 z-30 grid place-items-end bg-ink/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:place-items-center">
          <div
            className={`w-full max-w-md rounded-2xl px-5 py-6 ${
              overlay.kind === 'admitted' || (overlay.kind === 'result' && overlay.result.valid)
                ? 'bg-admit text-white'
                : 'bg-card text-copy'
            }`}
          >
            {overlay.kind === 'error' ? (
              <>
                <p className="text-2xl font-semibold tracking-tight">Check-in failed</p>
                <p className="mt-2 text-sm leading-6 opacity-80">{overlay.message}</p>
                <Button className="mt-6 w-full" variant="secondary" onClick={resetScanner}>
                  Continue
                </Button>
              </>
            ) : overlay.kind === 'admitted' ? (
              <>
                <p className="text-2xl font-semibold tracking-tight">Admitted</p>
                <p className="mt-2 text-lg font-medium">{overlay.result.guest_name}</p>
                <p className="mt-3 text-sm text-white/80">
                  {overlay.result.quantity} entered · {overlay.result.checked_in} of {overlay.result.guest_limit} used
                  {overlay.result.remaining ? ` · ${overlay.result.remaining} remaining` : ''}
                </p>
                <Button className="mt-6 w-full" variant="secondary" onClick={resetScanner}>
                  Next guest
                </Button>
              </>
            ) : (
              <ResultCard
                result={overlay.result}
                quantity={quantity}
                onQuantity={setQuantity}
                remaining={remaining}
                canAdmit={Boolean(canAdmit)}
                pending={admit.isPending}
                onAdmit={() => {
                  if (!overlay.result.invitation_id) return
                  admit.mutate({
                    invitationId: overlay.result.invitation_id,
                    quantity,
                    method: mode === 'manual' ? 'manual' : 'qr',
                  })
                }}
                onDismiss={resetScanner}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ResultCard({
  result,
  quantity,
  onQuantity,
  remaining,
  canAdmit,
  pending,
  onAdmit,
  onDismiss,
}: {
  result: CredentialResult
  quantity: number
  onQuantity: (value: number) => void
  remaining: number
  canAdmit: boolean
  pending: boolean
  onAdmit: () => void
  onDismiss: () => void
}) {
  const copy = CREDENTIAL_STATUS_COPY[result.status] ?? CREDENTIAL_STATUS_COPY.unknown
  const lastEntry = result.last_entry_at
    ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(result.last_entry_at))
    : null

  return (
    <>
      <p className="text-2xl font-semibold tracking-tight">{copy.title}</p>
      {result.guest_name ? <p className="mt-2 text-lg font-medium">{result.guest_name}</p> : null}
      {result.category || result.table_name || result.phone_ending ? (
        <p className="mt-1 text-sm opacity-80">
          {[
            result.category,
            result.table_name ? `Table ${result.table_name}` : null,
            result.phone_ending ? `Phone ending ${result.phone_ending.slice(-4)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
      {result.guest_limit != null ? (
        <p className="mt-3 text-sm opacity-80">
          Allowed {result.guest_limit} · Admitted {result.checked_in ?? 0} · Remaining {result.remaining ?? 0}
        </p>
      ) : (
        <p className="mt-3 text-sm opacity-80">{copy.body}</p>
      )}
      {lastEntry ? (
        <p className="mt-1 text-sm opacity-70">
          Last entry {lastEntry}
          {result.last_gate ? ` · ${result.last_gate}` : ''}
        </p>
      ) : null}

      {canAdmit && remaining > 1 ? (
        <label className="mt-5 grid gap-1.5 text-sm">
          <span className="font-medium">Quantity entering</span>
          <select
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm"
            value={quantity}
            onChange={(event) => onQuantity(Number(event.target.value))}
          >
            {Array.from({ length: remaining }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value} className="text-copy">
                {value}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-6 grid gap-2">
        {canAdmit ? (
          <Button className="w-full" variant="secondary" disabled={pending} onClick={onAdmit}>
            {pending ? 'Admitting…' : remaining === 1 ? 'Admit 1' : `Admit ${quantity}`}
          </Button>
        ) : null}
        <button
          type="button"
          className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium opacity-80"
          onClick={onDismiss}
        >
          {canAdmit ? 'Cancel' : 'Continue'}
        </button>
      </div>
    </>
  )
}
