import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { EventForm } from '@/components/events/EventForm'
import { createEvent } from '@/services/eventService'
import { emptyEventFormValues, formValuesToWriteInput, type EventFormValues } from '@/utils/eventForm'

export function CreateEventPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (values: EventFormValues) => createEvent(formValuesToWriteInput(values)),
    onSuccess: async (event) => {
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event created')
      navigate(`/events/${event.id}/overview`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not create event')
    },
  })

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-muted">New event</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Create event</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Capture the basics now. Guest lists, invitations, and gate scanning come after this foundation.
      </p>
      <div className="mt-8">
        <EventForm
          mode="create"
          defaultValues={emptyEventFormValues}
          submitting={mutation.isPending}
          submitLabel="Save draft"
          onCancel={() => navigate('/events')}
          onSubmit={(values) => mutation.mutate(values)}
        />
      </div>
    </div>
  )
}
