import { useEffect, useMemo, useState } from 'react'
import { previewGuestAdmission, searchEventGuests } from '@/services/checkInService'
import type { CredentialResult, GuestSearchHit } from '@/types/database'

type ManualSearchProps = {
  eventId: string
  gateId: string
  onSelect: (result: CredentialResult) => void
}

export function ManualSearch({ eventId, gateId, onSelect }: ManualSearchProps) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<GuestSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickingId, setPickingId] = useState<string | null>(null)

  useEffect(() => {
    const needle = query.trim()
    if (needle.length < 2) {
      setHits([])
      setError(null)
      setLoading(false)
      return
    }

    const handle = window.setTimeout(() => {
      setLoading(true)
      void searchEventGuests(eventId, needle)
        .then((rows) => {
          setHits(rows)
          setError(null)
        })
        .catch((err) => {
          setHits([])
          setError(err instanceof Error ? err.message : 'Search failed.')
        })
        .finally(() => setLoading(false))
    }, 250)

    return () => window.clearTimeout(handle)
  }, [eventId, query])

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>()
    for (const hit of hits) {
      const key = hit.guest_name.trim().toLowerCase()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.values()].some((count) => count > 1)
  }, [hits])

  async function pick(hit: GuestSearchHit) {
    if (!hit.invitation_id) {
      onSelect({ valid: false, status: 'no_invitation', guest_name: hit.guest_name })
      return
    }
    setPickingId(hit.guest_id)
    try {
      const result = await previewGuestAdmission(eventId, hit.invitation_id, gateId)
      onSelect(result)
    } catch (err) {
      onSelect({
        valid: false,
        status: 'unknown',
        guest_name: hit.guest_name,
      })
      if (err instanceof Error) setError(err.message)
    } finally {
      setPickingId(null)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <label className="block text-sm text-white/70">
        Find guest
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, phone, or INV number"
          autoComplete="off"
          autoCapitalize="off"
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/8 px-3 py-2.5 text-sm text-white placeholder:text-white/35"
        />
      </label>

      {query.trim().length > 0 && query.trim().length < 2 ? (
        <p className="mt-4 text-sm text-white/55">Type at least two characters.</p>
      ) : null}
      {loading ? <p className="mt-4 text-sm text-white/55">Searching…</p> : null}
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      {!loading && query.trim().length >= 2 && hits.length === 0 && !error ? (
        <p className="mt-4 text-sm text-white/55">No matching guests.</p>
      ) : null}

      {duplicateNames ? (
        <p className="mt-4 rounded-lg border border-white/15 bg-white/6 px-3 py-2 text-sm text-white/80">
          Multiple guests share a name. Check table and phone ending before admitting.
        </p>
      ) : null}

      {hits.length > 0 ? (
        <ul className="mt-4 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
          {hits.map((hit) => (
          <li key={hit.guest_id}>
            <button
              type="button"
              disabled={pickingId === hit.guest_id}
              onClick={() => void pick(hit)}
              className="flex w-full cursor-pointer flex-col items-start gap-1 px-4 py-3 text-left hover:bg-white/6 disabled:opacity-50"
            >
              <span className="font-medium text-white">{hit.guest_name}</span>
              <span className="text-sm text-white/60">
                {[
                  hit.category,
                  hit.table_name ? `Table ${hit.table_name}` : null,
                  hit.phone_ending ? `Phone ending ${hit.phone_ending.slice(-4)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No category or table'}
              </span>
              <span className="text-xs text-white/45">
                {hit.invitation_number ?? 'No invitation'} · Allowed {hit.guest_limit} · Remaining {hit.remaining}
              </span>
            </button>
          </li>
        ))}
        </ul>
      ) : null}
    </div>
  )
}
