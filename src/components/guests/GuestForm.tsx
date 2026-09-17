import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/common/Button'
import { Field, Input, Select, Textarea } from '@/components/common/Field'
import type { GuestCategory } from '@/types/database'
import { GUEST_STATUSES } from '@/types/guest'
import {
  emptyGuestFormValues,
  guestFormSchema,
  type GuestFormValues,
} from '@/utils/guestForm'

type GuestFormProps = {
  categories: GuestCategory[]
  defaultValues?: GuestFormValues
  submitting?: boolean
  submitLabel: string
  onCancel: () => void
  onSubmit: (values: GuestFormValues) => void
}

export function GuestForm({
  categories,
  defaultValues = emptyGuestFormValues,
  submitting = false,
  submitLabel,
  onCancel,
  onSubmit,
}: GuestFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues,
  })

  return (
    <form className="grid gap-8" onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className="grid gap-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Guest</h2>
        <Field id="display_name" label="Name" error={errors.display_name?.message}>
          <Input
            id="display_name"
            error={Boolean(errors.display_name)}
            placeholder="Tunde Adebayo"
            {...register('display_name')}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="first_name" label="First name">
            <Input id="first_name" {...register('first_name')} />
          </Field>
          <Field id="last_name" label="Last name">
            <Input id="last_name" {...register('last_name')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="email" label="Email" hint="Optional">
            <Input id="email" type="email" autoComplete="off" {...register('email')} />
          </Field>
          <Field id="phone" label="Phone" hint="Optional">
            <Input id="phone" type="tel" {...register('phone')} />
          </Field>
        </div>
        <Field id="company" label="Company">
          <Input id="company" {...register('company')} />
        </Field>
      </section>

      <section className="grid gap-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Access</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="guest_category_id" label="Category">
            <Select
              id="guest_category_id"
              {...register('guest_category_id', {
                onChange: (event) => {
                  const category = categories.find((item) => item.id === event.target.value)
                  if (category) setValue('guest_limit', String(category.default_guest_limit))
                },
              })}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="guest_limit"
            label="Guest allowance"
            error={errors.guest_limit?.message}
            hint="How many people this record can admit."
          >
            <Input id="guest_limit" type="number" min={1} inputMode="numeric" {...register('guest_limit')} />
          </Field>
          <Field id="table_name" label="Table">
            <Input id="table_name" placeholder="12" {...register('table_name')} />
          </Field>
          <Field id="seat_number" label="Seat">
            <Input id="seat_number" {...register('seat_number')} />
          </Field>
        </div>
        <Field id="status" label="Guest status">
          <Select id="status" {...register('status')}>
            {GUEST_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="notes" label="Notes">
          <Textarea id="notes" {...register('notes')} />
        </Field>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
