import type { ReactNode } from 'react'
import { Button } from '@/components/common/Button'

type EmptyStateProps = {
  title: string
  body: string
  actionTo?: string
  actionLabel?: string
  icon?: ReactNode
}

export function EmptyState({ title, body, actionTo, actionLabel, icon }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-14 text-center">
      {icon ? <div className="mb-4 flex justify-center text-muted">{icon}</div> : null}
      <h2 className="text-lg font-semibold tracking-tight text-copy">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{body}</p>
      {actionTo && actionLabel ? (
        <div className="mt-6">
          <Button to={actionTo}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  )
}
