import { useQuery } from '@tanstack/react-query'
import { isSupabaseConfigured } from '@/lib/supabase'
import { openEventRegistration } from '@/services/registrationService'

export function useOpenEventRegistration(token: string | undefined) {
  return useQuery({
    queryKey: ['open-event-registration', token],
    queryFn: () => openEventRegistration(token as string),
    enabled: Boolean(isSupabaseConfigured && token),
    retry: false,
  })
}
