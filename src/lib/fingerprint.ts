const KEY = 'labdesk.fingerprint'

export function getFingerprint(): string {
  try {
    const existing = sessionStorage.getItem(KEY)
    if (existing) return existing
    const nonce = crypto.randomUUID()
    sessionStorage.setItem(KEY, nonce)
    return nonce
  } catch {
    return crypto.randomUUID()
  }
}
