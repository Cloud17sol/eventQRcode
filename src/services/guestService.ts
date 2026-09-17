import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Guest, GuestCategory, GuestWriteInput } from '@/types/database'
import { emptyToNull } from '@/utils/validation'
import { issueInvitation, issueMissingInvitations } from '@/services/invitationService'

function requireConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Connect Supabase before managing guests.')
  }
}

function guestPayload(eventId: string, input: GuestWriteInput) {
  return {
    event_id: eventId,
    display_name: input.display_name.trim(),
    first_name: emptyToNull(input.first_name),
    last_name: emptyToNull(input.last_name),
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    company: emptyToNull(input.company),
    guest_category_id: input.guest_category_id,
    table_name: emptyToNull(input.table_name),
    seat_number: emptyToNull(input.seat_number),
    guest_limit: input.guest_limit,
    notes: emptyToNull(input.notes),
    status: input.status,
  }
}

export async function listGuestCategories(eventId: string): Promise<GuestCategory[]> {
  requireConfigured()
  const { data, error } = await supabase
    .from('guest_categories')
    .select('*')
    .eq('event_id', eventId)
    .order('priority', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as GuestCategory[]
}

export async function createGuestCategory(
  eventId: string,
  input: { name: string; default_guest_limit: number },
): Promise<GuestCategory> {
  requireConfigured()
  const { data, error } = await supabase
    .from('guest_categories')
    .insert({
      event_id: eventId,
      name: input.name.trim(),
      default_guest_limit: input.default_guest_limit,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as GuestCategory
}

export async function deleteGuestCategory(categoryId: string): Promise<void> {
  requireConfigured()
  const { error } = await supabase.from('guest_categories').delete().eq('id', categoryId)
  if (error) throw new Error(error.message)
}

export async function listGuests(eventId: string): Promise<Guest[]> {
  requireConfigured()
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .order('display_name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Guest[]
}

export async function getGuest(guestId: string): Promise<Guest> {
  requireConfigured()
  const { data, error } = await supabase.from('guests').select('*').eq('id', guestId).single()
  if (error) throw new Error(error.message)
  return data as Guest
}

export async function createGuest(eventId: string, input: GuestWriteInput): Promise<Guest> {
  requireConfigured()
  const { data, error } = await supabase
    .from('guests')
    .insert(guestPayload(eventId, input))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  const guest = data as Guest
  await issueInvitation(guest.id)
  return guest
}

export async function createGuests(eventId: string, inputs: GuestWriteInput[]): Promise<Guest[]> {
  requireConfigured()
  if (inputs.length === 0) return []

  const { data, error } = await supabase
    .from('guests')
    .insert(inputs.map((input) => guestPayload(eventId, input)))
    .select('*')

  if (error) throw new Error(error.message)
  await issueMissingInvitations(eventId)
  return (data ?? []) as Guest[]
}

export async function updateGuest(guestId: string, eventId: string, input: GuestWriteInput): Promise<Guest> {
  requireConfigured()
  const { data, error } = await supabase
    .from('guests')
    .update(guestPayload(eventId, input))
    .eq('id', guestId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Guest
}

export async function deleteGuest(guestId: string): Promise<void> {
  requireConfigured()
  const { error } = await supabase.from('guests').delete().eq('id', guestId)
  if (error) throw new Error(error.message)
}

export async function ensureCategoriesByName(
  eventId: string,
  names: string[],
): Promise<GuestCategory[]> {
  const existing = await listGuestCategories(eventId)
  const created: GuestCategory[] = [...existing]

  for (const name of names) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const found = created.find((item) => item.name.toLowerCase() === trimmed.toLowerCase())
    if (found) continue
    created.push(await createGuestCategory(eventId, { name: trimmed, default_guest_limit: 1 }))
  }

  return created
}
