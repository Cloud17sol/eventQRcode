export function registrationPath(token: string) {
  return `/r/${encodeURIComponent(token)}`
}

export function registrationUrl(token: string) {
  return `${window.location.origin}${registrationPath(token)}`
}
