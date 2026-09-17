export const GUEST_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const GUEST_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
}
