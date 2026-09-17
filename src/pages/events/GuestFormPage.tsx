import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { GuestForm } from '@/components/guests/GuestForm'
import { useGuest, useGuestCategories } from '@/hooks/useGuests'
import { createGuest, updateGuest } from '@/services/guestService'
import type { Event } from '@/types/database'
import {
  emptyGuestFormValues,
  formValuesToGuestInput,
  guestToFormValues,
  type GuestFormValues,
} from '@/utils/guestForm'

export function GuestFormPage() {
  const event = useOutletContext<Event>()
  const { guestId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !guestId
  const { data: categories = [] } = useGuestCategories(event.id)
  const { data: guest, isLoading, isError, error } = useGuest(isNew ? undefined : guestId)

  const mutation = useMutation({
    mutationFn: (values: GuestFormValues) => {
      const input = formValuesToGuestInput(values)
      return isNew ? createGuest(event.id, input) : updateGuest(guestId as string, event.id, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['guests'] })
      await queryClient.invalidateQueries({ queryKey: ['invitations'] })
      toast.success(isNew ? 'Guest added' : 'Guest updated')
      navigate(`/events/${event.id}/guests`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not save guest')
    },
  })

  if (!isNew && isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-line/70" />
  }

  if (!isNew && (isError || !guest)) {
    return (
      <p className="text-sm text-danger">
        {error instanceof Error ? error.message : 'This guest is missing or you do not have access.'}
      </p>
    )
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold tracking-tight">{isNew ? 'Add guest' : 'Edit guest'}</h2>
      <p className="mt-1 text-sm text-muted">
        Phone and email are optional. Allowance is how many people this record can admit at the door.
      </p>
      <div className="mt-8">
        <GuestForm
          categories={categories}
          defaultValues={guest ? guestToFormValues(guest) : emptyGuestFormValues}
          submitting={mutation.isPending}
          submitLabel={isNew ? 'Add guest' : 'Save changes'}
          onCancel={() => navigate(`/events/${event.id}/guests`)}
          onSubmit={(values) => mutation.mutate(values)}
        />
      </div>
    </div>
  )
}
