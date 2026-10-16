import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireEnv } from './env'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client
  const { url, anonKey } = requireEnv()
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  return client
}

export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<T> {
  const { url, anonKey } = requireEnv()
  const session = await getSupabase().auth.getSession()
  const token = session.data.session?.access_token ?? anonKey
  const response = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => ({}))) as T
  if (!response.ok) {
    const error = (payload as { error?: string }).error ?? 'Request failed.'
    throw new Error(error)
  }
  return payload
}
