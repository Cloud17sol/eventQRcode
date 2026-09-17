import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type {
  EventInvitation,
  IssuedInvitation,
  OpenInvitation,
  RsvpStatus,
} from '@/types/database'

function requireConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Connect Supabase before managing invitations.')
  }
}

function rpcError(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Invitation request failed.')
}

function asJson<T>(data: unknown): T {
  if (typeof data === 'string') return JSON.parse(data) as T
  return data as T
}

export async function issueInvitation(guestId: string): Promise<IssuedInvitation> {
  requireConfigured()
  const { data, error } = await supabase.rpc('issue_invitation', { p_guest_id: guestId })
  if (error) rpcError(error)
  return asJson<IssuedInvitation>(data)
}

export async function issueMissingInvitations(eventId: string): Promise<number> {
  requireConfigured()
  const { data, error } = await supabase.rpc('issue_missing_invitations', { p_event_id: eventId })
  if (error) rpcError(error)
  return Number(data ?? 0)
}

export async function listEventInvitations(eventId: string): Promise<EventInvitation[]> {
  requireConfigured()
  const { data, error } = await supabase.rpc('list_event_invitations', { p_event_id: eventId })
  if (error) rpcError(error)
  return (data ?? []) as EventInvitation[]
}

export async function getOrganizerInviteToken(invitationId: string): Promise<string> {
  requireConfigured()
  const { data, error } = await supabase.rpc('organizer_invite_token', { p_invitation_id: invitationId })
  if (error) rpcError(error)
  return data as string
}

export async function setInvitationStatus(invitationId: string, status: 'active' | 'revoked' | 'cancelled') {
  requireConfigured()
  const { error } = await supabase.rpc('set_invitation_status', {
    p_invitation_id: invitationId,
    p_status: status,
  })
  if (error) rpcError(error)
}

export async function markInvitationShared(invitationId: string, method: string) {
  requireConfigured()
  const { error } = await supabase.rpc('mark_invitation_shared', {
    p_invitation_id: invitationId,
    p_method: method,
  })
  if (error) rpcError(error)
}

export async function openInvitation(token: string): Promise<OpenInvitation> {
  requireConfigured()
  const { data, error } = await supabase.rpc('open_invitation', { p_token: token })
  if (error) rpcError(error)
  return asJson<OpenInvitation>(data)
}

export async function submitRsvp(
  token: string,
  status: Exclude<RsvpStatus, 'pending'>,
  attendingCount: number,
  message: string,
): Promise<OpenInvitation> {
  requireConfigured()
  const { data, error } = await supabase.rpc('submit_rsvp', {
    p_token: token,
    p_status: status,
    p_attending_count: attendingCount,
    p_message: message,
  })
  if (error) rpcError(error)
  return asJson<OpenInvitation>(data)
}
