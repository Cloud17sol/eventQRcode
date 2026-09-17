import { useEffect, useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Field'
import { useRecentCheckIns } from '@/hooks/useCheckIns'
import { useEventLive } from '@/hooks/useDashboard'
import type { Event } from '@/types/database'

const PAGE_SIZE = 20

const METHOD_LABEL: Record<string, string> = {
  qr: 'QR',
  manual: 'Manual',
  override: 'Override',
  offline_sync: 'Offline',
}

function stamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function CheckInsPage() {
  const event = useOutletContext<Event>()
  useEventLive(event.id)
  const { data: checkIns = [], isLoading, isError, error } = useRecentCheckIns(event.id, 500)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return checkIns
    return checkIns.filter((item) => {
      const haystack = [
        item.guest_name,
        item.gate_name,
        METHOD_LABEL[item.method] ?? item.method,
        String(item.quantity),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [checkIns, query])

  useEffect(() => {
    setPage(0)
  }, [query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const to = Math.min(filtered.length, currentPage * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Check-ins</h2>
          <p className="mt-1 text-sm text-muted">
            Append-only log. Search by guest, gate, or method.
          </p>
        </div>
        {event.status === 'active' ? <Button to={`/scan/${event.id}`}>Open scanner</Button> : null}
      </div>

      {checkIns.length > 0 ? (
        <div>
          <label className="sr-only" htmlFor="check-in-search">
            Search check-ins
          </label>
          <Input
            id="check-in-search"
            value={query}
            onChange={(fieldEvent) => setQuery(fieldEvent.target.value)}
            placeholder="Search guest, gate, or method"
            className="sm:max-w-sm"
          />
        </div>
      ) : null}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-line/70" />
      ) : isError ? (
        <p className="text-sm text-danger">{error instanceof Error ? error.message : 'Could not load check-ins.'}</p>
      ) : checkIns.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No check-ins yet"
          body="Admissions from the scanner or manual search will list here with gate and method."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching check-ins" body="Try another name, gate, or method." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-line text-xs font-medium text-muted">
              <tr>
                <th className="w-[28%] px-3 py-3 sm:px-4">When</th>
                <th className="px-3 py-3 sm:px-4">Guest</th>
                <th className="w-14 px-3 py-3 sm:px-4">Qty</th>
                <th className="hidden w-24 px-3 py-3 sm:table-cell sm:px-4">Method</th>
                <th className="hidden w-[28%] px-3 py-3 sm:table-cell sm:px-4">Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((item) => (
                <tr key={item.check_in_id} className="text-copy">
                  <td className="px-3 py-3 text-muted sm:px-4">{stamp(item.created_at)}</td>
                  <td className="min-w-0 truncate px-3 py-3 font-medium sm:px-4">
                    {item.guest_name}
                    <span className="mt-0.5 block truncate text-xs font-normal text-muted sm:hidden">
                      {METHOD_LABEL[item.method] ?? item.method}
                      {item.gate_name ? ` · ${item.gate_name}` : ''}
                    </span>
                  </td>
                  <td className="px-3 py-3 sm:px-4">{item.quantity}</td>
                  <td className="hidden px-3 py-3 sm:table-cell sm:px-4">{METHOD_LABEL[item.method] ?? item.method}</td>
                  <td className="hidden truncate px-3 py-3 sm:table-cell sm:px-4">{item.gate_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col gap-3 border-t border-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-sm text-muted">
              {from}–{to} of {filtered.length}
            </p>
            {pageCount > 1 ? (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
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
        </div>
      )}
    </div>
  )
}
