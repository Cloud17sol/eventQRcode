import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Gate } from '@/types/database'

function requireConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Connect Supabase before managing gates.')
  }
}

export async function listGates(eventId: string): Promise<Gate[]> {
  requireConfigured()
  const { data, error } = await supabase
    .from('gates')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Gate[]
}

export async function createGate(eventId: string, name: string): Promise<Gate> {
  requireConfigured()
  const { data, error } = await supabase
    .from('gates')
    .insert({ event_id: eventId, name: name.trim(), is_active: true })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Gate
}

export async function setGateActive(gateId: string, isActive: boolean): Promise<void> {
  requireConfigured()
  const { error } = await supabase.from('gates').update({ is_active: isActive }).eq('id', gateId)
  if (error) throw new Error(error.message)
}

export async function renameGate(gateId: string, name: string): Promise<void> {
  requireConfigured()
  const { error } = await supabase.from('gates').update({ name: name.trim() }).eq('id', gateId)
  if (error) throw new Error(error.message)
}
