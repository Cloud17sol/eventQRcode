export type UserRole = 'organizer' | 'staff' | 'platform_admin'

export type Profile = {
  id: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export type EventStatus =
  | 'draft'
  | 'published'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'archived'

export type EventType =
  | 'wedding'
  | 'birthday'
  | 'reception'
  | 'conference'
  | 'corporate'
  | 'concert'
  | 'religious'
  | 'school'
  | 'community'
  | 'private_party'
  | 'product_launch'
  | 'fundraiser'
  | 'other'

export type Event = {
  id: string
  organizer_id: string
  name: string
  slug: string | null
  event_type: EventType | string | null
  description: string | null
  event_date: string | null
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  cover_image_url: string | null
  logo_url: string | null
  status: EventStatus
  timezone: string | null
  guest_limit: number | null
  allow_rsvp: boolean
  allow_plus_one: boolean
  access_pass_enabled: boolean
  allow_maybe_rsvp: boolean
  fast_scan_enabled: boolean
  registration_enabled: boolean
  created_at: string
  updated_at: string
}

export type EventWriteInput = {
  name: string
  event_type: string
  description: string
  event_date: string
  start_time: string
  end_time: string
  venue_name: string
  address: string
  city: string
  state: string
  country: string
  timezone: string
  guest_limit: number | null
  allow_rsvp: boolean
  allow_plus_one: boolean
  access_pass_enabled: boolean
  allow_maybe_rsvp: boolean
  fast_scan_enabled: boolean
}

export type CreateEventInput = EventWriteInput

export type UpdateEventInput = EventWriteInput & {
  status: EventStatus
}

export type GuestStatus = 'active' | 'blocked' | 'cancelled'

export type GuestCategory = {
  id: string
  event_id: string
  name: string
  description: string | null
  default_guest_limit: number
  priority: number
  created_at: string
}

export type Guest = {
  id: string
  event_id: string
  first_name: string | null
  last_name: string | null
  display_name: string
  email: string | null
  phone: string | null
  company: string | null
  guest_category_id: string | null
  table_name: string | null
  seat_number: string | null
  guest_limit: number
  notes: string | null
  status: GuestStatus
  created_at: string
  updated_at: string
}

export type GuestWriteInput = {
  display_name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  guest_category_id: string | null
  table_name: string
  seat_number: string
  guest_limit: number
  notes: string
  status: GuestStatus
}

export type InvitationStatus = 'active' | 'revoked' | 'expired' | 'cancelled'
export type RsvpStatus = 'pending' | 'attending' | 'not_attending' | 'maybe'

export type EventInvitation = {
  invitation_id: string
  guest_id: string
  guest_name: string
  invitation_number: string
  status: InvitationStatus
  rsvp_status: RsvpStatus
  attending_count: number | null
  opened_at: string | null
  sent_at: string | null
  delivery_method: string | null
}

export type IssuedInvitation = {
  invitation_id: string
  invitation_number: string
  token: string
  created: boolean
}

export type OpenInvitation = {
  status: string
  invitation_number?: string
  invitation_status?: string
  guest_name?: string
  guest_limit?: number
  category?: string | null
  table_name?: string | null
  event_name?: string
  event_type?: string | null
  event_date?: string | null
  start_time?: string | null
  end_time?: string | null
  venue_name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  description?: string | null
  cover_image_url?: string | null
  event_status?: string
  allow_rsvp?: boolean
  allow_maybe_rsvp?: boolean
  access_pass_enabled?: boolean
  rsvp_status?: RsvpStatus
  attending_count?: number | null
  rsvp_message?: string | null
}

export type OpenEventRegistration = {
  status: string
  event_name?: string
  event_type?: string | null
  event_date?: string | null
  start_time?: string | null
  end_time?: string | null
  venue_name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  description?: string | null
  cover_image_url?: string | null
  guest_name?: string
}

export type Gate = {
  id: string
  event_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type InvitationAdmission = {
  guest_id: string
  invitation_id: string | null
  guest_limit: number
  admitted: number
  remaining: number
}

export type AdmissionSummary = {
  expected: number
  checked_in: number
  remaining: number
}

export type RecentCheckIn = {
  check_in_id: string
  guest_name: string
  quantity: number
  method: string
  gate_name: string | null
  created_at: string
}

export type CredentialStatus =
  | 'valid'
  | 'partial'
  | 'fully_used'
  | 'revoked'
  | 'expired'
  | 'unknown'
  | 'wrong_event'
  | 'invalid_gate'
  | 'event_not_open'
  | 'event_cancelled'
  | 'unauthorized'
  | 'no_invitation'

export type CredentialResult = {
  valid: boolean
  status: CredentialStatus | string
  invitation_id?: string
  guest_name?: string
  category?: string | null
  table_name?: string | null
  guest_limit?: number
  checked_in?: number
  remaining?: number
  fast_scan?: boolean
  last_entry_at?: string | null
  last_gate?: string | null
  phone_ending?: string | null
  event_name?: string
  event_status?: string
}

export type GuestSearchHit = {
  invitation_id: string | null
  guest_id: string
  guest_name: string
  category: string | null
  table_name: string | null
  phone_ending: string | null
  invitation_number: string | null
  guest_limit: number
  admitted: number
  remaining: number
}

export type CheckInResult = {
  ok: boolean
  status: string
  check_in_id?: string
  guest_name?: string
  guest_limit?: number
  quantity?: number
  checked_in?: number
  remaining?: number
}

export type StaffRole = 'scanner' | 'gate_supervisor' | 'event_manager'

export type EventAccess = {
  role: 'organizer' | StaffRole | 'none'
  is_organizer: boolean
  can_manage: boolean
  can_scan: boolean
  can_manual_checkin: boolean
  can_override: boolean
  can_undo_checkin: boolean
  can_view_guest_details: boolean
}

export type EventStaffMember = {
  staff_id: string
  user_id: string
  full_name: string | null
  email: string | null
  role: StaffRole | string
  can_scan: boolean
  can_manual_checkin: boolean
  can_override: boolean
  can_undo_checkin: boolean
  can_view_guest_details: boolean
}

export type EventDashboardGate = {
  id: string
  name: string
  is_active: boolean
  checked_in: number
}

export type EventDashboard = {
  invited: number
  expected: number
  checked_in: number
  remaining: number
  check_in_percent: number
  rsvp_attending: number
  rsvp_maybe: number
  rsvp_declined: number
  rsvp_pending: number
  vip_expected: number
  vip_checked_in: number
  general_expected: number
  general_checked_in: number
  gates: EventDashboardGate[]
  recent: RecentCheckIn[]
}
