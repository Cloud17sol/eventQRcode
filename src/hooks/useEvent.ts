import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getEvent, listEvents } from '@/services/eventService'

export function useEvents() {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['events', user?.id],
    queryFn: listEvents,
    enabled: Boolean(configured && user),
  })
}

export function useEvent(eventId: string | undefined) {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['events', user?.id, eventId],
    queryFn: () => getEvent(eventId as string),
    enabled: Boolean(configured && user && eventId),
  })
}
