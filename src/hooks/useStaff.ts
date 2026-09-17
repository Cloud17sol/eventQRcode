import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getEventAccess, listEventStaff } from '@/services/staffService'

export function useEventAccess(eventId: string | undefined) {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['event-access', user?.id, eventId],
    queryFn: () => getEventAccess(eventId as string),
    enabled: Boolean(configured && user && eventId),
  })
}

export function useEventStaff(eventId: string | undefined) {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['event-staff', user?.id, eventId],
    queryFn: () => listEventStaff(eventId as string),
    enabled: Boolean(configured && user && eventId),
  })
}
