// Client-side email format check — validate before hitting the API so we never
// dispatch a verification email to a malformed address. Deliberately simple and
// permissive (the backend re-validates authoritatively).
export function isValidEmail(value: string): boolean {
  const v = value.trim()
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}
