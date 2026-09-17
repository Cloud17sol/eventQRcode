import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { OpenEventRegistration } from '@/types/database'

function requireConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Connect Supabase before using event registration.')
  }
}

function rpcError(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Registration request failed.')
}

function asJson<T>(data: unknown): T {
  if (typeof data === 'string') return JSON.parse(data) as T
  return data as T
}

export async function ensureEventRegistration(eventId: string): Promise<string> {
  requireConfigured()
  const { data, error } = await supabase.rpc('ensure_event_registration', { p_event_id: eventId })
  if (error) rpcError(error)
  return data as string
}

export async function setEventRegistrationEnabled(eventId: string, enabled: boolean): Promise<boolean> {
  requireConfigured()
  const { data, error } = await supabase.rpc('set_event_registration_enabled', {
    p_event_id: eventId,
    p_enabled: enabled,
  })
  if (error) rpcError(error)
  return Boolean(data)
}

export async function openEventRegistration(token: string): Promise<OpenEventRegistration> {
  requireConfigured()
  const { data, error } = await supabase.rpc('open_event_registration', { p_token: token })
  if (error) rpcError(error)
  return asJson<OpenEventRegistration>(data)
}

export async function registerForEvent(
  token: string,
  name: string,
  email: string,
  phone: string,
): Promise<OpenEventRegistration> {
  requireConfigured()
  const { data, error } = await supabase.rpc('register_for_event', {
    p_token: token,
    p_name: name,
    p_email: email,
    p_phone: phone,
  })
  if (error) rpcError(error)
  return asJson<OpenEventRegistration>(data)
}
