import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { EventForm } from '@/components/events/EventForm'
import { updateEvent } from '@/services/eventService'
import type { Event } from '@/types/database'
import {
  eventToFormValues,
  formValuesToWriteInput,
  statusFromForm,
  type EventFormValues,
} from '@/utils/eventForm'

export function EventSettingsPage() {
  const event = useOutletContext<Event>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const archived = event.status === 'archived'

  const mutation = useMutation({
    mutationFn: (values: EventFormValues) =>
      updateEvent(event.id, {
        ...formValuesToWriteInput(values, event.timezone ?? undefined),
        status: statusFromForm(values.status),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event updated')
      navigate(`/events/${event.id}/overview`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not save event')
    },
  })

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold tracking-tight">Event settings</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        {archived
          ? 'This event is archived and cannot be changed.'
          : 'Update the event record. Guest lists and scanning are not edited here.'}
      </p>
      <div className="mt-8">
        <EventForm
          mode="edit"
          defaultValues={eventToFormValues(event)}
          submitting={mutation.isPending}
          readOnly={archived}
          submitLabel="Save changes"
          onCancel={() => navigate(`/events/${event.id}/overview`)}
          onSubmit={(values) => mutation.mutate(values)}
        />
      </div>
    </div>
  )
}
