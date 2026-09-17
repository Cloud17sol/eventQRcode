import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { EventAccess, EventStaffMember, StaffRole } from '@/types/database'

function requireConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Connect Supabase before managing staff.')
  }
}

function asJson<T>(data: unknown): T {
  if (typeof data === 'string') return JSON.parse(data) as T
  return data as T
}

export async function getEventAccess(eventId: string): Promise<EventAccess> {
  requireConfigured()
  const { data, error } = await supabase.rpc('event_access', { p_event_id: eventId })
  if (error) throw new Error(error.message)
  return asJson<EventAccess>(data)
}

export async function listEventStaff(eventId: string): Promise<EventStaffMember[]> {
  requireConfigured()
  const { data, error } = await supabase.rpc('list_event_staff', { p_event_id: eventId })
  if (error) throw new Error(error.message)
  return (data ?? []) as EventStaffMember[]
}

export async function assignEventStaff(eventId: string, email: string, role: StaffRole): Promise<void> {
  requireConfigured()
  const { error } = await supabase.rpc('assign_event_staff', {
    p_event_id: eventId,
    p_email: email,
    p_role: role,
  })
  if (error) throw new Error(error.message)
}

export async function setEventStaffRole(staffId: string, role: StaffRole): Promise<void> {
  requireConfigured()
  const { error } = await supabase.rpc('set_event_staff_role', {
    p_staff_id: staffId,
    p_role: role,
  })
  if (error) throw new Error(error.message)
}

export async function removeEventStaff(staffId: string): Promise<void> {
  requireConfigured()
  const { error } = await supabase.rpc('remove_event_staff', { p_staff_id: staffId })
  if (error) throw new Error(error.message)
}
