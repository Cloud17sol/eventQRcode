export const DEFAULT_PASS_BACKGROUND = '#FFFFFF'
export const PASS_GOLD = '#C4A35A'
export const PASS_GOLD_ON_DARK = '#E4C36A'

export function normalizePassColor(value?: string | null) {
  return /^#[0-9A-Fa-f]{6}$/.test(value ?? '') ? value!.toUpperCase() : DEFAULT_PASS_BACKGROUND
}

export function passIsDark(hex: string) {
  const n = hex.replace('#', '')
  const r = Number.parseInt(n.slice(0, 2), 16)
  const g = Number.parseInt(n.slice(2, 4), 16)
  const b = Number.parseInt(n.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b < 155
}

export function passInk(hex: string) {
  return passIsDark(hex) ? '#F7F4EE' : '#121A22'
}

export function passMuted(hex: string) {
  return passIsDark(hex) ? 'rgba(247, 244, 238, 0.62)' : '#5C6B78'
}

export function passGold(hex: string) {
  return passIsDark(hex) ? PASS_GOLD_ON_DARK : PASS_GOLD
}

export function passLine(hex: string) {
  return passIsDark(hex) ? 'rgba(247, 244, 238, 0.22)' : '#D5DCE3'
}
