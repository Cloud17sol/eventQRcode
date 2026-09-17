import { useState } from 'react'
import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/common/Button'
import { Field, Input } from '@/components/common/Field'
import { createGuestCategory, deleteGuestCategory } from '@/services/guestService'
import type { GuestCategory } from '@/types/database'

type CategoryManagerProps = {
  eventId: string
  categories: GuestCategory[]
}

export function CategoryManager({ eventId, categories }: CategoryManagerProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [limit, setLimit] = useState('1')
  const [open, setOpen] = useState(false)

  const createMutation = useMutation({
    mutationFn: () =>
      createGuestCategory(eventId, {
        name,
        default_guest_limit: Math.max(1, Number(limit) || 1),
      }),
    onSuccess: async () => {
      setName('')
      setLimit('1')
      await queryClient.invalidateQueries({ queryKey: ['guest-categories'] })
      toast.success('Category added')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not add category')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGuestCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['guest-categories'] })
      await queryClient.invalidateQueries({ queryKey: ['guests'] })
      toast.success('Category removed')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not remove category')
    },
  })

  return (
    <section className="rounded-2xl border border-line bg-card">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-copy">Categories</span>
          <span className="mt-0.5 block text-sm text-muted">
            {categories.length === 0 ? 'None yet. Add VIP, Family, or your own labels.' : `${categories.length} defined`}
          </span>
        </span>
        <span className="text-sm font-medium text-admit">{open ? 'Hide' : 'Manage'}</span>
      </button>

      {open ? (
        <div className="border-t border-line px-5 py-4">
          {categories.length > 0 ? (
            <ul className="mb-4 divide-y divide-line">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="text-sm font-medium text-copy">{category.name}</span>
                    <span className="ml-2 text-xs text-muted">Admits {category.default_guest_limit}</span>
                  </span>
                  <button
                    type="button"
                    className="cursor-pointer text-sm text-danger"
                    onClick={() => deleteMutation.mutate(category.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted">Categories are per event. Guests can be added without one.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_7rem_auto] sm:items-end">
            <Field id="category-name" label="Name">
              <Input id="category-name" value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field id="category-limit" label="Default allowance">
              <Input
                id="category-limit"
                type="number"
                min={1}
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
              />
            </Field>
            <Button
              disabled={createMutation.isPending || name.trim().length < 1}
              onClick={() => createMutation.mutate()}
            >
              Add
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
