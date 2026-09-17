import { Link } from 'react-router-dom'

type LogoProps = {
  inverted?: boolean
  to?: string
}

export function Logo({ inverted = false, to }: LogoProps) {
  const color = inverted ? 'text-white' : 'text-ink'

  const mark = (
    <>
      <span
        className={`relative grid h-8 w-8 place-items-center overflow-hidden rounded-md ${
          inverted ? 'bg-white/10' : 'bg-ink'
        }`}
        aria-hidden="true"
      >
        <span className={`absolute inset-y-1 left-[11px] w-px border-l border-dashed ${inverted ? 'border-white/50' : 'border-white/70'}`} />
        <span className={`h-1.5 w-2.5 translate-x-[5px] rounded-[1px] ${inverted ? 'bg-admit' : 'bg-admit'}`} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Doorlist</span>
    </>
  )

  if (!to) {
    return <span className={`inline-flex items-center gap-2.5 ${color}`}>{mark}</span>
  }

  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 ${color}`}>
      {mark}
    </Link>
  )
}
