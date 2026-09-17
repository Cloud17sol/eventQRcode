import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export async function getOwnProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Profile | null
}
