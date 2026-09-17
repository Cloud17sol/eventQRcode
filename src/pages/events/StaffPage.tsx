import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Field, Input, Select } from '@/components/common/Field'
import { useEventStaff } from '@/hooks/useStaff'
import { assignEventStaff, removeEventStaff, setEventStaffRole } from '@/services/staffService'
import type { Event, StaffRole } from '@/types/database'
import { STAFF_ROLES } from '@/types/staff'

export function StaffPage() {
  const event = useOutletContext<Event>()
  const queryClient = useQueryClient()
  const { data: staff = [], isLoading, isError, error } = useEventStaff(event.id)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('scanner')

  const assign = useMutation({
    mutationFn: () => assignEventStaff(event.id, email, role),
    onSuccess: async () => {
      setEmail('')
      await queryClient.invalidateQueries({ queryKey: ['event-staff'] })
      toast.success('Staff assigned')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not assign staff')
    },
  })

  const changeRole = useMutation({
    mutationFn: ({ staffId, nextRole }: { staffId: string; nextRole: StaffRole }) =>
      setEventStaffRole(staffId, nextRole),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['event-staff'] })
      toast.success('Role updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not update role')
    },
  })

  const remove = useMutation({
    mutationFn: removeEventStaff,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['event-staff'] })
      toast.success('Staff removed')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not remove staff')
    },
  })

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Staff</h2>
        <p className="mt-1 text-sm text-muted">
          Assign people who already have a Doorlist account. They only see this event at the door.
        </p>
      </div>

      <form
        className="grid gap-3 rounded-2xl border border-line bg-card p-5 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault()
          if (email.trim()) assign.mutate()
        }}
      >
        <Field id="staff-email" label="Email">
          <Input
            id="staff-email"
            type="email"
            value={email}
            onChange={(fieldEvent) => setEmail(fieldEvent.target.value)}
            placeholder="gate@example.com"
          />
        </Field>
        <Field id="staff-role" label="Role">
          <Select id="staff-role" value={role} onChange={(fieldEvent) => setRole(fieldEvent.target.value as StaffRole)}>
            {STAFF_ROLES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={assign.isPending || email.trim().length < 3}>
          {assign.isPending ? 'Adding…' : 'Add staff'}
        </Button>
      </form>

      <p className="text-sm text-muted">{STAFF_ROLES.find((item) => item.value === role)?.help}</p>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-line/70" />
      ) : isError ? (
        <p className="text-sm text-danger">{error instanceof Error ? error.message : 'Could not load staff.'}</p>
      ) : staff.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No staff yet"
          body="Add a scanner or supervisor by the email they used to sign up."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {staff.map((member) => (
            <li key={member.staff_id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-medium text-copy">{member.full_name?.trim() || member.email}</p>
                <p className="mt-0.5 text-sm text-muted">{member.email}</p>
                <p className="mt-1 text-xs text-muted">
                  {member.can_scan ? 'Scan' : 'No scan'}
                  {' · '}
                  {member.can_manual_checkin ? 'Manual' : 'No manual'}
                  {member.can_override ? ' · Override' : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={member.role}
                  onChange={(fieldEvent) =>
                    changeRole.mutate({
                      staffId: member.staff_id,
                      nextRole: fieldEvent.target.value as StaffRole,
                    })
                  }
                >
                  {STAFF_ROLES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  className="cursor-pointer text-sm font-medium text-danger"
                  onClick={() => remove.mutate(member.staff_id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
