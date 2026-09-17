import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DoorOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Field, Input } from '@/components/common/Field'
import { useGates } from '@/hooks/useCheckIns'
import { createGate, setGateActive } from '@/services/gateService'
import type { Event } from '@/types/database'

export function GatesPage() {
  const event = useOutletContext<Event>()
  const queryClient = useQueryClient()
  const { data: gates = [], isLoading, isError, error } = useGates(event.id)
  const [name, setName] = useState('')

  const create = useMutation({
    mutationFn: () => createGate(event.id, name),
    onSuccess: async () => {
      setName('')
      await queryClient.invalidateQueries({ queryKey: ['gates'] })
      toast.success('Gate added')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not add gate')
    },
  })

  const toggle = useMutation({
    mutationFn: ({ gateId, isActive }: { gateId: string; isActive: boolean }) => setGateActive(gateId, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gates'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not update gate')
    },
  })

  const activeCount = gates.filter((gate) => gate.is_active).length

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Gates</h2>
          <p className="mt-1 text-sm text-muted">
            {activeCount} active. Scanner staff pick a gate before admitting guests.
          </p>
        </div>
        {event.status === 'active' ? (
          <Button to={`/scan/${event.id}`}>Open scanner</Button>
        ) : (
          <p className="text-sm text-muted">Set status to Door open before scanning.</p>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-line/70" />
      ) : isError ? (
        <p className="text-sm text-danger">{error instanceof Error ? error.message : 'Could not load gates.'}</p>
      ) : gates.length === 0 ? (
        <EmptyState
          icon={<DoorOpen className="h-6 w-6" />}
          title="No gates yet"
          body="Add Main Entrance or any door you will staff. New events get one automatically after the latest migration."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {gates.map((gate) => (
            <li key={gate.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-medium text-copy">{gate.name}</p>
                <p className="mt-0.5 text-sm text-muted">{gate.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <button
                type="button"
                className="cursor-pointer text-sm font-medium text-admit"
                onClick={() => toggle.mutate({ gateId: gate.id, isActive: !gate.is_active })}
              >
                {gate.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="grid gap-3 rounded-2xl border border-line bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(eventSubmit) => {
          eventSubmit.preventDefault()
          if (name.trim()) create.mutate()
        }}
      >
        <Field id="gate-name" label="New gate">
          <Input
            id="gate-name"
            value={name}
            onChange={(eventField) => setName(eventField.target.value)}
            placeholder="VIP Entrance"
          />
        </Field>
        <Button type="submit" disabled={create.isPending || name.trim().length < 1}>
          {create.isPending ? 'Adding…' : 'Add gate'}
        </Button>
      </form>
    </div>
  )
}
