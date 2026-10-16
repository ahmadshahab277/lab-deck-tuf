import { getFingerprint } from './fingerprint'
import { getSupabase, invokeFunction } from './supabase'
import type { VerifyResult } from '../types'

const TOKEN_KEY = 'labdesk.class.token'
const SLUG_KEY = 'labdesk.class.slug'
const EXPIRY_KEY = 'labdesk.class.expires'

export function storedClassSession(): { token: string; slug: string } | null {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const slug = sessionStorage.getItem(SLUG_KEY)
  const expires = sessionStorage.getItem(EXPIRY_KEY)
  if (!token || !slug) return null
  if (expires && new Date(expires).getTime() <= Date.now()) {
    clearClassSession()
    return null
  }
  return { token, slug }
}

export function persistClassSession(slug: string, token: string, expiresAt: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(SLUG_KEY, slug)
  sessionStorage.setItem(EXPIRY_KEY, expiresAt)
}

export function clearClassSession(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(SLUG_KEY)
  sessionStorage.removeItem(EXPIRY_KEY)
}

export async function verifyClassPassword(slug: string, password: string): Promise<VerifyResult> {
  const fingerprint = getFingerprint()
  const { data, error } = await getSupabase().rpc('verify_class_password', {
    p_slug: slug,
    p_password: password,
    p_fingerprint: fingerprint,
  })
  if (!error && data) {
    return data as VerifyResult
  }

  try {
    return await invokeFunction<VerifyResult>('verify-class-password', {
      slug,
      password,
      fingerprint,
    })
  } catch {
    return { ok: false, error: 'Unable to verify class access.' }
  }
}

export async function revokeLocalClassSession(): Promise<void> {
  const session = storedClassSession()
  if (session) {
    await getSupabase().rpc('student_revoke_session', { p_token: session.token })
  }
  clearClassSession()
}
