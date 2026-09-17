import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getGuest, listGuestCategories, listGuests } from '@/services/guestService'

export function useGuests(eventId: string | undefined) {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['guests', user?.id, eventId],
    queryFn: () => listGuests(eventId as string),
    enabled: Boolean(configured && user && eventId),
  })
}

export function useGuest(guestId: string | undefined) {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['guests', 'detail', user?.id, guestId],
    queryFn: () => getGuest(guestId as string),
    enabled: Boolean(configured && user && guestId),
  })
}

export function useGuestCategories(eventId: string | undefined) {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['guest-categories', user?.id, eventId],
    queryFn: () => listGuestCategories(eventId as string),
    enabled: Boolean(configured && user && eventId),
  })
}
