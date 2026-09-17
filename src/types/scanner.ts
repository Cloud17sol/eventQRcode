export const CREDENTIAL_STATUS_COPY: Record<string, { title: string; body: string }> = {
  valid: {
    title: 'Valid invitation',
    body: 'Confirm how many people are entering, then admit.',
  },
  partial: {
    title: 'Partial entry',
    body: 'Some of this invitation has already been admitted.',
  },
  fully_used: {
    title: 'Already fully checked in',
    body: 'This invitation has no remaining allowance.',
  },
  revoked: {
    title: 'Access revoked',
    body: 'Contact the event supervisor.',
  },
  expired: {
    title: 'Invitation expired',
    body: 'This credential is no longer valid.',
  },
  unknown: {
    title: 'Invalid QR code',
    body: 'This code is not a Doorlist invitation.',
  },
  wrong_event: {
    title: 'Invalid for this event',
    body: 'This credential belongs to another event.',
  },
  invalid_gate: {
    title: 'Choose an active gate',
    body: 'Select a gate before scanning.',
  },
  event_not_open: {
    title: 'Door is not open',
    body: 'Set the event status to Door open before scanning.',
  },
  event_cancelled: {
    title: 'Event cancelled',
    body: 'Do not admit guests for this event.',
  },
  unauthorized: {
    title: 'Not authorized',
    body: 'Sign in as the organizer to scan this event.',
  },
  no_invitation: {
    title: 'No invitation issued',
    body: 'Issue an invitation from the guest list before admitting this person.',
  },
  admitted: {
    title: 'Admitted',
    body: 'Entry recorded.',
  },
  invalid_count: {
    title: 'Quantity not allowed',
    body: 'Choose a number within the remaining allowance.',
  },
}

export function gateStorageKey(eventId: string) {
  return `doorlist.gate.${eventId}`
}
