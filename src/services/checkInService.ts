import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type {
  AdmissionSummary,
  CheckInResult,
  CredentialResult,
  GuestSearchHit,
  InvitationAdmission,
  RecentCheckIn,
} from '@/types/database'

function requireConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Connect Supabase before scanning.')
  }
}

function asJson<T>(data: unknown): T {
  if (typeof data === 'string') return JSON.parse(data) as T
  return data as T
}

function friendlyError(message: string) {
  if (/schema cache|could not find the function/i.test(message)) {
    return 'Run the gates and check-in SQL migration, then try again.'
  }
  return 'Unable to verify invitation. Check the connection and try again.'
}

export async function validateEventCredential(
  token: string,
  eventId: string,
  gateId: string,
): Promise<CredentialResult> {
  requireConfigured()
  const { data, error } = await supabase.rpc('validate_event_credential', {
    p_token: token,
    p_event_id: eventId,
    p_gate_id: gateId,
  })
  if (error) throw new Error(friendlyError(error.message))
  return asJson<CredentialResult>(data)
}

export async function checkInGuest(
  eventId: string,
  invitationId: string,
  quantity: number,
  gateId: string,
  method: 'qr' | 'manual' | 'override' = 'qr',
): Promise<CheckInResult> {
  requireConfigured()
  const { data, error } = await supabase.rpc('check_in_guest', {
    p_event_id: eventId,
    p_invitation_id: invitationId,
    p_quantity: quantity,
    p_gate_id: gateId,
    p_method: method,
  })
  if (error) throw new Error('We could not complete the check-in. No entry has been recorded.')
  return asJson<CheckInResult>(data)
}

export async function listInvitationAdmissions(eventId: string): Promise<InvitationAdmission[]> {
  requireConfigured()
  const { data, error } = await supabase.rpc('list_invitation_admissions', { p_event_id: eventId })
  if (error) throw new Error(error.message)
  return (data ?? []) as InvitationAdmission[]
}

export async function getAdmissionSummary(eventId: string): Promise<AdmissionSummary> {
  requireConfigured()
  const { data, error } = await supabase.rpc('event_admission_summary', { p_event_id: eventId })
  if (error) throw new Error(error.message)
  return asJson<AdmissionSummary>(data)
}

export async function listRecentCheckIns(eventId: string, limit = 20): Promise<RecentCheckIn[]> {
  requireConfigured()
  const { data, error } = await supabase.rpc('list_recent_check_ins', {
    p_event_id: eventId,
    p_limit: limit,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as RecentCheckIn[]
}

export async function searchEventGuests(eventId: string, query: string): Promise<GuestSearchHit[]> {
  requireConfigured()
  const { data, error } = await supabase.rpc('search_event_guests', {
    p_event_id: eventId,
    p_query: query,
  })
  if (error) throw new Error(friendlyError(error.message))
  return (data ?? []) as GuestSearchHit[]
}

export async function previewGuestAdmission(
  eventId: string,
  invitationId: string,
  gateId: string,
): Promise<CredentialResult> {
  requireConfigured()
  const { data, error } = await supabase.rpc('preview_guest_admission', {
    p_event_id: eventId,
    p_invitation_id: invitationId,
    p_gate_id: gateId,
  })
  if (error) throw new Error(friendlyError(error.message))
  return asJson<CredentialResult>(data)
}
