import { useEffect, useState, type ReactNode } from 'react'
import { qrDataUrl } from '@/utils/qr'
import { normalizePassColor, passGold, passInk, passLine, passMuted } from '@/utils/passTheme'

export type AccessPassDetails = {
  guestName: string
  eventName: string
  when: string
  venue: string
  invitationNumber: string
  category?: string | null
  tableName?: string | null
  logoUrl?: string | null
  backgroundColor?: string | null
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

  const background = normalizePassColor(details.backgroundColor)
  const ink = passInk(background)
  const muted = passMuted(background)
  const gold = passGold(background)
  const line = passLine(background)
  const place = [details.tableName ? `Table ${details.tableName}` : null, details.category].filter(Boolean).join(' · ')

  return (
    <article
      className="relative overflow-hidden rounded-2xl border px-6 py-8 text-center shadow-[0_16px_40px_-28px_rgba(18,26,34,0.45)] sm:px-8"
      style={{ backgroundColor: background, borderColor: line, color: ink }}
    >
      {details.logoUrl ? (
        <img src={details.logoUrl} alt="" className="mx-auto h-14 w-auto max-w-[9rem] object-contain" />
      ) : null}

      <p
        className="text-[10px] font-medium tracking-[0.28em] uppercase"
        style={{ color: muted, marginTop: details.logoUrl ? 16 : 0 }}
      >
        Access pass
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance">{details.eventName}</h2>
      <p className="mt-3 text-xs tracking-[0.12em]" style={{ color: muted }}>
        {details.invitationNumber}
      </p>

      <div className="mt-8 grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:text-left">
        <ScanFrame gold={gold} ink={ink}>
          {qr ? (
            <img src={qr} alt="Access pass QR" className="h-full w-full bg-white" />
          ) : (
            <div className="h-full w-full animate-pulse bg-white/80" />
          )}
        </ScanFrame>

        <dl className="grid gap-4 text-sm">
          <div>
            <dt className="text-[10px] font-medium tracking-[0.18em] uppercase" style={{ color: muted }}>
              When
            </dt>
            <dd className="mt-1 font-medium leading-6">{details.when}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium tracking-[0.18em] uppercase" style={{ color: muted }}>
              Where
            </dt>
            <dd className="mt-1 font-medium leading-6">{details.venue || 'Venue to be announced'}</dd>
          </div>
          {place ? (
            <div>
              <dt className="text-[10px] font-medium tracking-[0.18em] uppercase" style={{ color: muted }}>
                Place
              </dt>
              <dd className="mt-1 font-medium leading-6">{place}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <p className="mt-8 text-xs" style={{ color: muted }}>
        Show this at the door
      </p>
    </article>
  )
}

function ScanFrame({
  gold,
  ink,
  children,
}: {
  gold: string
  ink: string
  children: ReactNode
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px]">
      <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-medium tracking-[0.32em]" style={{ color: ink }}>
        SCAN ME
      </span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] font-medium tracking-[0.32em]" style={{ color: ink }}>
        SCAN ME
      </span>
      <span
        className="absolute top-1/2 left-1.5 text-[9px] font-medium tracking-[0.32em]"
        style={{ color: ink, writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
      >
        SCAN ME
      </span>
      <span
        className="absolute top-1/2 right-1.5 text-[9px] font-medium tracking-[0.32em]"
        style={{ color: ink, writingMode: 'vertical-rl', transform: 'translateY(-50%)' }}
      >
        SCAN ME
      </span>
      <span className="absolute top-3 left-3 h-5 w-5 rounded-tl-md border-t-2 border-l-2" style={{ borderColor: gold }} />
      <span className="absolute top-3 right-3 h-5 w-5 rounded-tr-md border-t-2 border-r-2" style={{ borderColor: gold }} />
      <span className="absolute bottom-3 left-3 h-5 w-5 rounded-bl-md border-b-2 border-l-2" style={{ borderColor: gold }} />
      <span className="absolute bottom-3 right-3 h-5 w-5 rounded-br-md border-b-2 border-r-2" style={{ borderColor: gold }} />
      <div className="absolute inset-[1.65rem] overflow-hidden bg-white">{children}</div>
    </div>
  )
}
