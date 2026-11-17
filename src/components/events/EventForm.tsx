import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Button } from '@/components/common/Button'
import { Field, Input, Select, Textarea } from '@/components/common/Field'
import { removeEventLogo, uploadEventLogo } from '@/services/storageService'
import { EVENT_STATUSES, EVENT_TYPES } from '@/types/event'
import {
  emptyEventFormValues,
  eventFormSchema,
  type EventFormValues,
} from '@/utils/eventForm'

type EventFormProps = {
  mode: 'create' | 'edit'
  eventId?: string
  defaultValues?: EventFormValues
  submitting?: boolean
  readOnly?: boolean
  submitLabel: string
  onCancel: () => void
  onSubmit: (values: EventFormValues) => void
}

export function EventForm({
  mode,
  eventId,
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  })
  const currentStatus = watch('status')
  const logoUrl = watch('logo_url')
  const passBackground = watch('pass_background_color')
  const [logoBusy, setLogoBusy] = useState(false)

  async function onLogoFile(file: File | undefined) {
    if (!eventId || !file) return
    setLogoBusy(true)
    try {
      const url = await uploadEventLogo(eventId, file)
      setValue('logo_url', url, { shouldDirty: true })
      toast.success('Logo uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload logo')
    } finally {
      setLogoBusy(false)
    }
  }

  async function onLogoRemove() {
    if (!eventId) return
    setLogoBusy(true)
    try {
      await removeEventLogo(eventId)
      setValue('logo_url', '', { shouldDirty: true })
      toast.success('Logo removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove logo')
    } finally {
      setLogoBusy(false)
    }
  }

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

        <section className="grid gap-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">Access pass look</h2>
          <p className="text-sm text-muted">
            Logo and background apply to the guest pass and the downloaded PNG.
          </p>
          <input type="hidden" {...register('logo_url')} />
          {eventId ? (
            <Field id="logo" label="Event logo" hint="PNG, JPG, or WebP. 2MB or smaller.">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div
                  className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl border border-line bg-paper"
                  style={{ backgroundColor: passBackground }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <span className="px-2 text-center text-[10px] text-muted">No logo</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium text-copy hover:border-copy/30">
                    {logoBusy ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
                    <input
                      id="logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={logoBusy || readOnly}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        event.target.value = ''
                        void onLogoFile(file)
                      }}
                    />
                  </label>
                  {logoUrl ? (
                    <Button type="button" variant="secondary" disabled={logoBusy || readOnly} onClick={() => void onLogoRemove()}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </Field>
          ) : (
            <p className="text-sm text-muted">Save the event first, then add a logo from settings.</p>
          )}
          <Field
            id="pass_background_color"
            label="Pass background"
            error={errors.pass_background_color?.message}
            hint="Guests will see this color behind the QR card."
          >
            <div className="flex items-center gap-3">
              <input
                id="pass_background_color"
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(passBackground) ? passBackground : '#FFFFFF'}
                onChange={(event) => setValue('pass_background_color', event.target.value.toUpperCase(), { shouldDirty: true })}
                className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-card p-1"
              />
              <Input
                value={passBackground}
                onChange={(event) => setValue('pass_background_color', event.target.value.toUpperCase(), { shouldDirty: true })}
                error={Boolean(errors.pass_background_color)}
                aria-label="Pass background hex color"
              />
            </div>
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
