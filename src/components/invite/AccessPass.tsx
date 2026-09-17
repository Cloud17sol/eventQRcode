import { useEffect, useState } from 'react'
import { qrDataUrl } from '@/utils/qr'

export type AccessPassDetails = {
  guestName: string
  eventName: string
  when: string
  venue: string
  invitationNumber: string
  category?: string | null
  tableName?: string | null
}

type AccessPassProps = {
  details: AccessPassDetails
  credentialUrl: string
}

export function AccessPass({ details, credentialUrl }: AccessPassProps) {
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void qrDataUrl(credentialUrl).then((url) => {
      if (active) setQr(url)
    })
    return () => {
      active = false
    }
  }, [credentialUrl])

  const place = [details.tableName ? `Table ${details.tableName}` : null, details.category].filter(Boolean).join(' · ')

  return (
    <article className="ticket-stub relative overflow-hidden rounded-2xl border border-line bg-card shadow-[0_12px_32px_-24px_rgba(18,26,34,0.55)]">
      <span className="ticket-perf pointer-events-none absolute inset-y-5 left-[18px] w-px" aria-hidden="true" />
      <div className="bg-ink px-6 py-5 pl-8 text-white sm:px-7 sm:pl-9">
        <p className="text-xs font-medium text-white/60">Access pass</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-balance">{details.eventName}</h2>
      </div>
      <div className="px-6 py-5 pl-8 sm:px-7 sm:pl-9">
        <p className="text-lg font-semibold tracking-tight break-words text-copy">{details.guestName}</p>
        <p className="mt-1 text-sm text-muted">{details.invitationNumber}</p>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-muted">When</dt>
            <dd className="mt-0.5 font-medium text-copy">{details.when}</dd>
          </div>
          <div>
            <dt className="text-muted">Where</dt>
            <dd className="mt-0.5 font-medium text-copy">{details.venue || 'Venue to be announced'}</dd>
          </div>
          {place ? (
            <div>
              <dt className="text-muted">Place</dt>
              <dd className="mt-0.5 font-medium text-copy">{place}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-5 flex justify-center rounded-xl border border-line bg-white p-4">
          {qr ? (
            <img src={qr} alt={`QR for ${details.guestName}`} className="h-44 w-44 sm:h-52 sm:w-52" />
          ) : (
            <div className="h-44 w-44 animate-pulse rounded-lg bg-line/70 sm:h-52 sm:w-52" />
          )}
        </div>
        <p className="mt-3 text-center text-xs text-muted">Show this at the door. Doorlist</p>
      </div>
    </article>
  )
}
