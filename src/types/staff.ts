import type { StaffRole } from '@/types/database'

export const STAFF_ROLES: { value: StaffRole; label: string; help: string }[] = [
  {
    value: 'scanner',
    label: 'Scanner',
    help: 'QR scan and manual check-in at assigned events only.',
  },
  {
    value: 'gate_supervisor',
    label: 'Gate supervisor',
    help: 'Door access plus override and undo permissions.',
  },
  {
    value: 'event_manager',
    label: 'Event manager',
    help: 'Same door permissions as a supervisor for this event.',
  },
]

export const STAFF_ROLE_LABEL: Record<string, string> = Object.fromEntries(
  STAFF_ROLES.map((item) => [item.value, item.label]),
)
