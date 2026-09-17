import { EVENT_STATUS_LABEL } from '@/types/event'

const stampClass: Record<string, string> = {
  draft: 'text-warn ring-warn/30',
  published: 'text-admit ring-admit/30',
  active: 'text-admit ring-admit/40',
  completed: 'text-muted ring-line',
  cancelled: 'text-danger ring-danger/30',
  archived: 'text-muted ring-line',
}

type StatusStampProps = {
  status: string
  tilt?: boolean
}

export function StatusStamp({ status, tilt = false }: StatusStampProps) {
  const tone = stampClass[status] ?? stampClass.draft

  return (
    <span
      className={`inline-flex w-fit rounded-sm px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 ${tone} ${
        tilt ? 'rotate-[-8deg]' : ''
      }`}
    >
      {EVENT_STATUS_LABEL[status] ?? status}
    </span>
  )
}
