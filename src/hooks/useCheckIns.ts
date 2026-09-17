import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import {
  getAdmissionSummary,
  listInvitationAdmissions,
  listRecentCheckIns,
} from '@/services/checkInService'
import { listGates } from '@/services/gateService'

export function useGates(eventId: string | undefined) {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['gates', user?.id, eventId],
    queryFn: () => listGates(eventId as string),
    enabled: Boolean(configured && user && eventId),
  })
}

export function useAdmissions(eventId: string | undefined) {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['admissions', user?.id, eventId],
    queryFn: () => listInvitationAdmissions(eventId as string),
    enabled: Boolean(configured && user && eventId),
  })
}

export function useAdmissionSummary(eventId: string | undefined) {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['admission-summary', user?.id, eventId],
    queryFn: () => getAdmissionSummary(eventId as string),
    enabled: Boolean(configured && user && eventId),
  })
}

export function useRecentCheckIns(eventId: string | undefined, limit = 20) {
  const { user, configured } = useAuth()

  return useQuery({
    queryKey: ['check-ins', user?.id, eventId, limit],
    queryFn: () => listRecentCheckIns(eventId as string, limit),
    enabled: Boolean(configured && user && eventId),
  })
}
