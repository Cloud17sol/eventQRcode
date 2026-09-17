import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/common/Button'
import { Field, Input, Select, Textarea } from '@/components/common/Field'
import { EVENT_STATUSES, EVENT_TYPES } from '@/types/event'
import {
  emptyEventFormValues,
  eventFormSchema,
  type EventFormValues,
} from '@/utils/eventForm'

type EventFormProps = {
  mode: 'create' | 'edit'
  defaultValues?: EventFormValues
  submitting?: boolean
  readOnly?: boolean
  submitLabel: string
  onCancel: () => void
  onSubmit: (values: EventFormValues) => void
}

export function EventForm({
  mode,
  defaultValues = emptyEventFormValues,
  submitting = false,
  readOnly = false,
  submitLabel,
  onCancel,
  onSubmit,
}: EventFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  })
  const currentStatus = watch('status')

  return (
    <form className="grid gap-8" onSubmit={handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={readOnly} className="grid gap-8 disabled:opacity-80">
        {mode === 'edit' ? (
          <section className="grid gap-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
            <h2 className="text-base font-semibold">Status</h2>
            <Field
              id="status"
              label="Event status"
              hint={EVENT_STATUSES.find((item) => item.value === currentStatus)?.help}
            >
              <Select id="status" {...register('status')}>
                {EVENT_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
          </section>
        ) : null}

        <section className="grid gap-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">Event basics</h2>
          <Field id="name" label="Event name" error={errors.name?.message}>
            <Input id="name" error={Boolean(errors.name)} placeholder="Lola & Kunle Wedding" {...register('name')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="event_type" label="Event type" error={errors.event_type?.message}>
              <Select id="event_type" error={Boolean(errors.event_type)} {...register('event_type')}>
                {EVENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="event_date" label="Date" error={errors.event_date?.message}>
              <Input id="event_date" type="date" error={Boolean(errors.event_date)} {...register('event_date')} />
            </Field>
            <Field id="start_time" label="Start time">
              <Input id="start_time" type="time" {...register('start_time')} />
            </Field>
            <Field id="end_time" label="End time">
              <Input id="end_time" type="time" {...register('end_time')} />
            </Field>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">Venue</h2>
          <Field id="venue_name" label="Venue name">
            <Input id="venue_name" placeholder="The Palm Hall" {...register('venue_name')} />
          </Field>
          <Field id="address" label="Address">
            <Input id="address" {...register('address')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="city" label="City">
              <Input id="city" {...register('city')} />
            </Field>
            <Field id="state" label="State">
              <Input id="state" {...register('state')} />
            </Field>
            <Field id="country" label="Country">
              <Input id="country" {...register('country')} />
            </Field>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">Guest settings</h2>
          <Field id="guest_limit" label="Maximum guest count" hint="Optional. Leave blank if you do not have a cap yet.">
            <Input id="guest_limit" type="number" min={1} inputMode="numeric" {...register('guest_limit')} />
          </Field>
          <label htmlFor="allow_rsvp" className="flex cursor-pointer items-start gap-3 text-sm">
            <Controller
              name="allow_rsvp"
              control={control}
              render={({ field }) => (
                <input
                  id="allow_rsvp"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-admit"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <span>
              <span className="font-medium text-copy">Allow RSVP</span>
              <span className="mt-0.5 block text-muted">Guests will be able to respond once invitations are issued.</span>
            </span>
          </label>
          <label htmlFor="allow_plus_one" className="flex cursor-pointer items-start gap-3 text-sm">
            <Controller
              name="allow_plus_one"
              control={control}
              render={({ field }) => (
                <input
                  id="allow_plus_one"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-admit"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <span>
              <span className="font-medium text-copy">Allow plus-ones by default</span>
              <span className="mt-0.5 block text-muted">Individual guest allowances can still override this later.</span>
            </span>
          </label>
          <label htmlFor="allow_maybe_rsvp" className="flex cursor-pointer items-start gap-3 text-sm">
            <Controller
              name="allow_maybe_rsvp"
              control={control}
              render={({ field }) => (
                <input
                  id="allow_maybe_rsvp"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-admit"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <span>
              <span className="font-medium text-copy">Allow “maybe” RSVP</span>
              <span className="mt-0.5 block text-muted">Guests can respond as maybe instead of only yes or no.</span>
            </span>
          </label>
          <label htmlFor="access_pass_enabled" className="flex cursor-pointer items-start gap-3 text-sm">
            <Controller
              name="access_pass_enabled"
              control={control}
              render={({ field }) => (
                <input
                  id="access_pass_enabled"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-admit"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <span>
              <span className="font-medium text-copy">Show QR access pass</span>
              <span className="mt-0.5 block text-muted">Guests see their QR on the invitation after the event is published.</span>
            </span>
          </label>
          <label htmlFor="fast_scan_enabled" className="flex cursor-pointer items-start gap-3 text-sm">
            <Controller
              name="fast_scan_enabled"
              control={control}
              render={({ field }) => (
                <input
                  id="fast_scan_enabled"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-admit"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <span>
              <span className="font-medium text-copy">Fast scan for single guests</span>
              <span className="mt-0.5 block text-muted">Invitations that admit one person are checked in as soon as the QR is valid.</span>
            </span>
          </label>
          <Field id="description" label="Description">
            <Textarea id="description" {...register('description')} />
          </Field>
        </section>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {readOnly ? null : (
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : submitLabel}
          </Button>
        )}
      </div>
    </form>
  )
}
