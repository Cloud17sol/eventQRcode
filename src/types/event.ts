export const EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'reception', label: 'Reception' },
  { value: 'conference', label: 'Conference' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'concert', label: 'Concert' },
  { value: 'religious', label: 'Religious' },
  { value: 'school', label: 'School' },
  { value: 'community', label: 'Community' },
  { value: 'private_party', label: 'Private party' },
  { value: 'product_launch', label: 'Product launch' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'other', label: 'Other' },
] as const

export const EVENT_STATUSES = [
  {
    value: 'draft',
    label: 'Draft',
    help: 'Organizer configuration only. Invitation links stay closed.',
  },
  {
    value: 'published',
    label: 'Published',
    help: 'Invitation links can be shared. RSVP is active.',
  },
  {
    value: 'active',
    label: 'Door open',
    help: 'Scanner and check-in are allowed.',
  },
  {
    value: 'completed',
    label: 'Completed',
    help: 'Check-in is closed. Reports stay available.',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    help: 'Guests will see that the event is cancelled.',
  },
  {
    value: 'archived',
    label: 'Archived',
    help: 'Read-only historical record.',
  },
] as const

export const EVENT_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  EVENT_STATUSES.map((item) => [item.value, item.label]),
)

export function eventTypeLabel(value: string | null | undefined): string {
  if (!value) return 'Event'
  const match = EVENT_TYPES.find((item) => item.value === value)
  return match?.label ?? value
}
