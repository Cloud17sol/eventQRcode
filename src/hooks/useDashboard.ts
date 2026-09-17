import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getEventDashboard } from '@/services/dashboardService'

const LIVE_KEYS = ['event-dashboard', 'check-ins', 'admission-summary'] as const

export function useEventLive(eventId: string | undefined) {
  const queryClient = useQueryClient()
  const { user, configured } = useAuth()

  useEffect(() => {
    if (!configured || !isSupabaseConfigured || !user || !eventId) return

    const channel = supabase
      .channel(`event-live-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_live_pulse',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          for (const key of LIVE_KEYS) {
            void queryClient.invalidateQueries({ queryKey: [key] })
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [configured, eventId, queryClient, user])
}

export function useEventDashboard(eventId: string | undefined, live = false) {
  const { user, configured } = useAuth()
  useEventLive(live ? eventId : undefined)

  return useQuery({
    queryKey: ['event-dashboard', user?.id, eventId],
    queryFn: () => getEventDashboard(eventId as string),
    enabled: Boolean(configured && user && eventId),
    refetchInterval: live ? 15_000 : false,
  })
}
