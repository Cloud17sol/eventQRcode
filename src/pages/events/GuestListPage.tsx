import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Pencil, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useOutletContext } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input, Select } from '@/components/common/Field'
import { CategoryManager } from '@/components/guests/CategoryManager'
import { useAdmissions } from '@/hooks/useCheckIns'
import { useGuestCategories, useGuests } from '@/hooks/useGuests'
import { useEventInvitations } from '@/hooks/useInvitations'
import { useEventAccess } from '@/hooks/useStaff'
import { deleteEventGuests, deleteGuest, deleteGuests } from '@/services/guestService'
import { getOrganizerInviteToken, markInvitationShared } from '@/services/invitationService'
import { ensureEventRegistration, setEventRegistrationEnabled } from '@/services/registrationService'
import type { Event, Guest } from '@/types/database'
import { GUEST_STATUS_LABEL } from '@/types/guest'
import { invitationUrl, RSVP_STATUS_LABEL } from '@/types/invitation'
import { registrationUrl } from '@/types/registration'
import { downloadCsv, toCsv } from '@/utils/csv'

const PAGE_SIZE = 20

function contactLabel(guest: Guest) {
  return [guest.email, guest.phone].filter(Boolean).join(' · ') || '—'
}

const iconActionClass =
  'inline-flex h-8 w-7 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-paper hover:text-copy disabled:cursor-not-allowed disabled:opacity-40'

function GuestActions({
  editTo,
  canCopy,
  copying,
  confirmingDelete,
  onCopy,
  onAskDelete,
  onConfirmDelete,
}: {
  editTo: string
  canCopy: boolean
  copying: boolean
  confirmingDelete: boolean
  onCopy: () => void
  onAskDelete: () => void
  onConfirmDelete: () => void
}) {
  return (
    <div className="ml-auto flex w-max items-center justify-end gap-0">
      <Link to={editTo} aria-label="Edit guest" title="Edit" className={iconActionClass}>
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        aria-label="Copy invitation link"
        title="Copy invitation link"
        className={iconActionClass}
        disabled={copying || !canCopy}
        onClick={onCopy}
      >
        <Copy className="h-4 w-4" />
      </button>
      {confirmingDelete ? (
        <button
          type="button"
          aria-label="Confirm delete"
          title="Confirm delete"
          className="cursor-pointer px-1.5 text-xs font-medium text-danger"
          onClick={onConfirmDelete}
        >
          Delete
        </button>
      ) : (
        <button
          type="button"
          aria-label="Delete guest"
          title="Delete"
          className={`${iconActionClass} hover:text-danger`}
          onClick={onAskDelete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function GuestListPage() {
  const event = useOutletContext<Event>()
  const queryClient = useQueryClient()
  const { data: access } = useEventAccess(event.id)
  const canManage = access?.can_manage !== false
  const { data: guests = [], isLoading, isError, error } = useGuests(event.id)
  const { data: categories = [] } = useGuestCategories(event.id)
  const { data: invitations = [] } = useEventInvitations(event.id)
  const { data: admissions = [] } = useAdmissions(event.id)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [tableName, setTableName] = useState('all')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [busyCopy, setBusyCopy] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [busyLink, setBusyLink] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [confirmBulk, setConfirmBulk] = useState<'selected' | 'all' | null>(null)

  const invitationsByGuest = useMemo(() => {
    return new Map(invitations.map((item) => [item.guest_id, item]))
  }, [invitations])

  const admissionsByGuest = useMemo(() => {
    return new Map(admissions.map((item) => [item.guest_id, item]))
  }, [admissions])

  const categoryName = (id: string | null) => categories.find((item) => item.id === id)?.name ?? '—'

  const tables = useMemo(() => {
    return [...new Set(guests.map((guest) => guest.table_name).filter((value): value is string => Boolean(value)))]
  }, [guests])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return guests.filter((guest) => {
      const matchesStatus = status === 'all' || guest.status === status
      const matchesCategory = categoryId === 'all' || guest.guest_category_id === categoryId
      const matchesTable = tableName === 'all' || guest.table_name === tableName
      const haystack = [guest.display_name, guest.email, guest.phone, guest.table_name, guest.notes, categoryName(guest.guest_category_id)]
        .join(' ')
        .toLowerCase()
      const matchesQuery = needle.length === 0 || haystack.includes(needle)
      return matchesStatus && matchesCategory && matchesTable && matchesQuery
    })
  }, [categoryId, categories, guests, query, status, tableName])

  useEffect(() => {
    setPage(0)
    setConfirmBulk(null)
  }, [query, status, categoryId, tableName])

  useEffect(() => {
    const known = new Set(guests.map((guest) => guest.id))
    setSelected((current) => {
      const next = current.filter((id) => known.has(id))
      return next.length === current.length ? current : next
    })
  }, [guests])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const to = Math.min(filtered.length, currentPage * PAGE_SIZE + PAGE_SIZE)
  const filteredIds = useMemo(() => filtered.map((guest) => guest.id), [filtered])
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.includes(id))

  function toggleSelected(guestId: string) {
    setConfirmBulk(null)
    setSelected((current) =>
      current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId],
    )
  }

  function toggleFiltered() {
    setConfirmBulk(null)
    setSelected((current) => {
      const selectedSet = new Set(current)
      if (filteredIds.every((id) => selectedSet.has(id))) {
        return current.filter((id) => !filteredIds.includes(id))
      }
      return [...new Set([...current, ...filteredIds])]
    })
  }

  const remove = useMutation({
    mutationFn: deleteGuest,
    onSuccess: async () => {
      setPendingDelete(null)
      await queryClient.invalidateQueries({ queryKey: ['guests'] })
      await queryClient.invalidateQueries({ queryKey: ['invitations'] })
      await queryClient.invalidateQueries({ queryKey: ['admissions'] })
      toast.success('Guest removed')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not delete guest')
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: string[]) => deleteGuests(event.id, ids),
    onSuccess: async (count) => {
      setSelected([])
      setConfirmBulk(null)
      await queryClient.invalidateQueries({ queryKey: ['guests'] })
      await queryClient.invalidateQueries({ queryKey: ['invitations'] })
      await queryClient.invalidateQueries({ queryKey: ['admissions'] })
      toast.success(count === 1 ? 'Guest removed' : `${count} guests removed`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not delete guests')
    },
  })

  const removeAll = useMutation({
    mutationFn: () => deleteEventGuests(event.id),
    onSuccess: async () => {
      setSelected([])
      setConfirmBulk(null)
      await queryClient.invalidateQueries({ queryKey: ['guests'] })
      await queryClient.invalidateQueries({ queryKey: ['invitations'] })
      await queryClient.invalidateQueries({ queryKey: ['admissions'] })
      toast.success('All guests removed')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not delete guests')
    },
  })

  const bulkBusy = removeMany.isPending || removeAll.isPending

  async function copyLink(guestId: string) {
    const invitation = invitationsByGuest.get(guestId)
    if (!invitation) {
      toast.error('This guest does not have an invitation yet')
      return
    }
    setBusyCopy(guestId)
    try {
      const token = await getOrganizerInviteToken(invitation.invitation_id)
      await navigator.clipboard.writeText(invitationUrl(token))
      await markInvitationShared(invitation.invitation_id, 'copy')
      await queryClient.invalidateQueries({ queryKey: ['invitations'] })
      toast.success('Invitation link copied')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not copy invitation')
    } finally {
      setBusyCopy(null)
    }
  }

  async function copyRegistrationLink() {
    setBusyLink(true)
    try {
      const token = await ensureEventRegistration(event.id)
      await navigator.clipboard.writeText(registrationUrl(token))
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Registration link copied')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not copy registration link')
    } finally {
      setBusyLink(false)
    }
  }

  async function closeRegistration() {
    setBusyLink(true)
    try {
      await setEventRegistrationEnabled(event.id, false)
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Registration closed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not close registration')
    } finally {
      setBusyLink(false)
    }
  }

  async function refreshList() {
    setRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['guests'] }),
        queryClient.invalidateQueries({ queryKey: ['guest-categories'] }),
        queryClient.invalidateQueries({ queryKey: ['invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['admissions'] }),
      ])
      toast.success('Guest list updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not refresh guests')
    } finally {
      setRefreshing(false)
    }
  }

  function exportGuests() {
    const csv = toCsv(
      ['name', 'email', 'phone', 'category', 'guest_limit', 'table', 'notes'],
      guests.map((guest) => [
        guest.display_name,
        guest.email ?? '',
        guest.phone ?? '',
        categoryName(guest.guest_category_id) === '—' ? '' : categoryName(guest.guest_category_id),
        guest.guest_limit != null ? String(guest.guest_limit) : '',
        guest.table_name ?? '',
        guest.notes ?? '',
      ]),
    )
    const slug = event.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'guests'
    downloadCsv(`${slug}-guests.csv`, csv)
    toast.success('Guest list exported')
  }

  const registrationOpen = event.registration_enabled === true

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Guests</h2>
          <p className="mt-1 text-sm text-muted">
            {guests.length} on the list. Export includes category, guest limit, table, and notes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={refreshing} onClick={() => void refreshList()}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button variant="secondary" onClick={exportGuests}>
            Export CSV
          </Button>
          <Button to={`/events/${event.id}/guests/import`} variant="secondary">
            Import CSV
          </Button>
          <Button to={`/events/${event.id}/guests/new`}>Add guest</Button>
        </div>
      </div>

      {canManage ? (
        <div className="rounded-2xl border border-line bg-card px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-copy">Invitee registration</p>
              <p className="mt-1 text-sm text-muted">
                {registrationOpen
                  ? 'Share the link. Invitees enter name, email, and phone. Category, table, and notes stay for you.'
                  : 'Copy a link so people can put themselves on the list with name, email, and phone.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="secondary" disabled={busyLink} onClick={() => void copyRegistrationLink()}>
                {busyLink ? 'Working…' : 'Copy registration link'}
              </Button>
              {registrationOpen ? (
                <Button variant="secondary" disabled={busyLink} onClick={() => void closeRegistration()}>
                  Close registration
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <CategoryManager eventId={event.id} categories={categories} />

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="sr-only" htmlFor="guest-search">
          Search guests
        </label>
        <Input
          id="guest-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, phone, email, or table"
        />
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'blocked', 'cancelled'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                status === item ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line hover:text-copy'
              }`}
            >
              {item === 'all' ? 'All' : GUEST_STATUS_LABEL[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="sr-only" htmlFor="category-filter">
            Category
          </label>
          <Select id="category-filter" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        </div>
        <div>
          <label className="sr-only" htmlFor="table-filter">
            Table
          </label>
          <Select id="table-filter" value={tableName} onChange={(event) => setTableName(event.target.value)}>
          <option value="all">All tables</option>
          {tables.map((table) => (
            <option key={table} value={table}>
              Table {table}
            </option>
          ))}
        </Select>
        </div>
      </div>

      <div className="grid gap-2">
      {canManage && guests.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {confirmBulk === 'all'
              ? 'This removes every guest, invitation, and check-in for this event.'
              : confirmBulk === 'selected'
                ? `This also removes invitations and check-ins for ${selected.length} selected ${selected.length === 1 ? 'guest' : 'guests'}.`
                : selected.length > 0
                  ? `${selected.length} selected`
                  : 'Select guests to delete'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={confirmBulk === 'selected' ? 'danger' : 'secondary'}
              disabled={selected.length === 0 || bulkBusy}
              onClick={() => {
                if (confirmBulk !== 'selected') {
                  setConfirmBulk('selected')
                  return
                }
                removeMany.mutate(selected)
              }}
            >
              {removeMany.isPending
                ? 'Deleting…'
                : confirmBulk === 'selected'
                  ? `Confirm ${selected.length}`
                  : 'Delete selected'}
            </Button>
            <Button
              variant={confirmBulk === 'all' ? 'danger' : 'secondary'}
              disabled={bulkBusy}
              onClick={() => {
                if (confirmBulk !== 'all') {
                  setConfirmBulk('all')
                  return
                }
                removeAll.mutate()
              }}
            >
              {removeAll.isPending
                ? 'Deleting…'
                : confirmBulk === 'all'
                  ? `Confirm all ${guests.length}`
                  : 'Delete all'}
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-line/70" />
      ) : isError ? (
        <p className="text-sm text-danger">{error instanceof Error ? error.message : 'Could not load guests.'}</p>
      ) : guests.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No guests yet"
          body="Share a registration link, add people one at a time, or import a CSV."
          actionTo={`/events/${event.id}/guests/new`}
          actionLabel="Add guest"
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching guests" body="Try another search, category, or status filter." />
      ) : (
        <>
          {canManage ? (
            <label className="flex items-center gap-2 text-sm text-muted md:hidden">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleFiltered}
                className="h-4 w-4 rounded border-line accent-admit"
              />
              Select all matching
            </label>
          ) : null}
          <div className="grid gap-3 md:hidden">
            {rows.map((guest) => (
              <article key={guest.id} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  {canManage ? (
                    <label className="mt-1 shrink-0">
                      <span className="sr-only">Select {guest.display_name}</span>
                      <input
                        type="checkbox"
                        checked={selected.includes(guest.id)}
                        onChange={() => toggleSelected(guest.id)}
                        className="h-4 w-4 rounded border-line accent-admit"
                      />
                    </label>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-copy">{guest.display_name}</p>
                    <p className="mt-1 text-sm text-muted">{categoryName(guest.guest_category_id)}</p>
                    <p className="mt-1 text-sm text-muted">{contactLabel(guest)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted">{GUEST_STATUS_LABEL[guest.status]}</span>
                </div>
                <p className="mt-3 text-sm text-muted">
                  {invitationsByGuest.get(guest.id)
                    ? RSVP_STATUS_LABEL[invitationsByGuest.get(guest.id)?.rsvp_status ?? 'pending']
                    : '—'}
                  {' · '}
                  Admits {guest.guest_limit}
                  {guest.table_name ? ` · Table ${guest.table_name}` : ''}
                </p>
                <div className="mt-3">
                  <GuestActions
                    editTo={`/events/${event.id}/guests/${guest.id}`}
                    canCopy={invitationsByGuest.has(guest.id)}
                    copying={busyCopy === guest.id}
                    confirmingDelete={pendingDelete === guest.id}
                    onCopy={() => void copyLink(guest.id)}
                    onAskDelete={() => setPendingDelete(guest.id)}
                    onConfirmDelete={() => remove.mutate(guest.id)}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-line bg-card md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-line text-xs font-medium text-muted">
                <tr>
                  {canManage ? (
                    <th className="w-10 px-3 py-3 lg:px-4">
                      <label>
                        <span className="sr-only">Select all matching guests</span>
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleFiltered}
                          className="h-4 w-4 rounded border-line accent-admit"
                        />
                      </label>
                    </th>
                  ) : null}
                  <th className="px-3 py-3 lg:px-4">Guest</th>
                  <th className="hidden px-3 py-3 lg:table-cell lg:px-4">Category</th>
                  <th className="hidden px-3 py-3 xl:table-cell xl:px-4">Contact</th>
                  <th className="hidden px-3 py-3 lg:table-cell lg:px-4">Invitation</th>
                  <th className="w-28 px-3 py-3 lg:px-4">RSVP</th>
                  <th className="w-20 px-3 py-3 lg:px-4">Door</th>
                  <th className="w-14 px-3 py-3 lg:px-4">Table</th>
                  <th className="w-[6.75rem] px-1.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((guest) => {
                  const admitted = admissionsByGuest.get(guest.id)?.admitted ?? 0
                  const remaining = admissionsByGuest.get(guest.id)?.remaining ?? guest.guest_limit
                  return (
                    <tr key={guest.id} className="text-copy">
                      {canManage ? (
                        <td className="px-3 py-3 lg:px-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${guest.display_name}`}
                            checked={selected.includes(guest.id)}
                            onChange={() => toggleSelected(guest.id)}
                            className="h-4 w-4 rounded border-line accent-admit"
                          />
                        </td>
                      ) : null}
                      <td className="min-w-0 px-3 py-3 lg:px-4">
                        <p className="truncate font-medium">{guest.display_name}</p>
                        <p className="mt-0.5 truncate text-xs font-normal text-muted">
                          {GUEST_STATUS_LABEL[guest.status]}
                          <span className="lg:hidden"> · {categoryName(guest.guest_category_id)}</span>
                        </p>
                      </td>
                      <td className="hidden truncate px-3 py-3 lg:table-cell lg:px-4">
                        {categoryName(guest.guest_category_id)}
                      </td>
                      <td className="hidden truncate px-3 py-3 text-muted xl:table-cell xl:px-4">
                        {contactLabel(guest)}
                      </td>
                      <td className="hidden truncate px-3 py-3 font-sans text-muted lg:table-cell lg:px-4">
                        {invitationsByGuest.get(guest.id)?.invitation_number ?? '—'}
                      </td>
                      <td className="truncate px-3 py-3 lg:px-4">
                        {invitationsByGuest.get(guest.id)
                          ? RSVP_STATUS_LABEL[invitationsByGuest.get(guest.id)?.rsvp_status ?? 'pending']
                          : '—'}
                      </td>
                      <td className="px-3 py-3 tabular-nums lg:px-4">
                        {admitted}/{guest.guest_limit}
                        <span className="mt-0.5 block text-xs text-muted">{remaining} left</span>
                      </td>
                      <td className="truncate px-3 py-3 lg:px-4">{guest.table_name || '—'}</td>
                      <td className="px-1.5 py-2">
                        <GuestActions
                          editTo={`/events/${event.id}/guests/${guest.id}`}
                          canCopy={invitationsByGuest.has(guest.id)}
                          copying={busyCopy === guest.id}
                          confirmingDelete={pendingDelete === guest.id}
                          onCopy={() => void copyLink(guest.id)}
                          onAskDelete={() => setPendingDelete(guest.id)}
                          onConfirmDelete={() => remove.mutate(guest.id)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-sm text-muted">
              {from}–{to} of {filtered.length}
              {selected.length > 0 ? ` · ${selected.length} selected` : ''}
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
    </div>
  )
}
