import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { EventDashboard } from '@/types/database'

function requireConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Connect Supabase before loading the door ledger.')
  }
}

function asJson<T>(data: unknown): T {
  if (typeof data === 'string') return JSON.parse(data) as T
  return data as T
}

export async function getEventDashboard(eventId: string): Promise<EventDashboard> {
  requireConfigured()
  const { data, error } = await supabase.rpc('event_dashboard', { p_event_id: eventId })
  if (error) throw new Error(error.message)
  const dashboard = asJson<EventDashboard>(data)
  return {
    ...dashboard,
    gates: dashboard.gates ?? [],
    recent: dashboard.recent ?? [],
  }
}
