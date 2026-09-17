import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { listEventInvitations, openInvitation } from '@/services/invitationService'

export function useEventInvitations(eventId: string | undefined) {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['invitations', user?.id, eventId],
    queryFn: () => listEventInvitations(eventId as string),
    enabled: Boolean(configured && user && eventId),
  })
}

export function useOpenInvitation(token: string | undefined) {
  return useQuery({
    queryKey: ['open-invitation', token],
    queryFn: () => openInvitation(token as string),
    enabled: Boolean(isSupabaseConfigured && token),
    retry: false,
  })
}
