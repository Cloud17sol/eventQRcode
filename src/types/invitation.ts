export const INVITATION_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  revoked: 'Revoked',
  expired: 'Expired',
  cancelled: 'Cancelled',
}

export const RSVP_STATUS_LABEL: Record<string, string> = {
  pending: 'No response',
  attending: 'Attending',
  not_attending: 'Declined',
  maybe: 'Maybe',
}

export function invitationPath(token: string) {
  return `/i/${encodeURIComponent(token)}`
}

export function invitationUrl(token: string) {
  return `${window.location.origin}${invitationPath(token)}`
}
