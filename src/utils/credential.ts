export function parseInviteCredential(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    const match = url.pathname.match(/\/i\/([^/]+)/)
    if (match?.[1]) return decodeURIComponent(match[1])
  } catch {
    const match = trimmed.match(/\/i\/([^/?#]+)/)
    if (match?.[1]) return decodeURIComponent(match[1])
  }

  if (/^INV-/i.test(trimmed)) return null
  if (trimmed.length >= 16 && !/\s/.test(trimmed)) return trimmed
  return null
}
