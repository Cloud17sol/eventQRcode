export function formatEventDate(value: string | null | undefined): string {
  if (!value) return 'Date to be set'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Date to be set'
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatTime(value: string | null | undefined): string | null {
  if (!value) return null
  const [hours, minutes] = value.split(':')
  if (hours === undefined || minutes === undefined) return value
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatEventWhen(
  date: string | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const day = formatEventDate(date)
  const startLabel = formatTime(start)
  const endLabel = formatTime(end)
  if (startLabel && endLabel) return `${day} · ${startLabel}–${endLabel}`
  if (startLabel) return `${day} · ${startLabel}`
  return day
}

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function toTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 5)
}
