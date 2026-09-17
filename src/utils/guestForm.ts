import { z } from 'zod'
import type { Guest, GuestStatus, GuestWriteInput } from '@/types/database'
import { GUEST_STATUSES } from '@/types/guest'

export const guestFormSchema = z.object({
  display_name: z.string().min(2, 'Enter the guest name'),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone: z.string(),
  company: z.string(),
  guest_category_id: z.string(),
  table_name: z.string(),
  seat_number: z.string(),
  guest_limit: z.string().min(1, 'Enter how many people this invitation admits'),
  notes: z.string(),
  status: z.string(),
})

export type GuestFormValues = z.infer<typeof guestFormSchema>

export const emptyGuestFormValues: GuestFormValues = {
  display_name: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company: '',
  guest_category_id: '',
  table_name: '',
  seat_number: '',
  guest_limit: '1',
  notes: '',
  status: 'active',
}

export function guestToFormValues(guest: Guest): GuestFormValues {
  return {
    display_name: guest.display_name,
    first_name: guest.first_name ?? '',
    last_name: guest.last_name ?? '',
    email: guest.email ?? '',
    phone: guest.phone ?? '',
    company: guest.company ?? '',
    guest_category_id: guest.guest_category_id ?? '',
    table_name: guest.table_name ?? '',
    seat_number: guest.seat_number ?? '',
    guest_limit: String(guest.guest_limit),
    notes: guest.notes ?? '',
    status: guest.status,
  }
}

export function guestStatusFromForm(value: string): GuestStatus {
  const match = GUEST_STATUSES.find((item) => item.value === value)
  return (match?.value ?? 'active') as GuestStatus
}

export function formValuesToGuestInput(values: GuestFormValues): GuestWriteInput {
  const parsedLimit = Number(values.guest_limit)
  return {
    display_name: values.display_name,
    first_name: values.first_name,
    last_name: values.last_name,
    email: values.email,
    phone: values.phone,
    company: values.company,
    guest_category_id: values.guest_category_id || null,
    table_name: values.table_name,
    seat_number: values.seat_number,
    guest_limit: Number.isFinite(parsedLimit) && parsedLimit >= 1 ? parsedLimit : 1,
    notes: values.notes,
    status: guestStatusFromForm(values.status),
  }
}
