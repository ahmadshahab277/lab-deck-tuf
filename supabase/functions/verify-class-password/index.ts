import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const GENERIC_ERROR = 'Unable to verify class access.'
const RATE_ERROR = 'Unable to verify class access. Please wait and try again.'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') || 'unknown'
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: GENERIC_ERROR }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  )

  try {
    const body = await req.json() as { slug?: string; password?: string; fingerprint?: string }
    const slug = typeof body.slug === 'string' ? body.slug : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint : ''
    const ipHash = await sha256Hex(clientIp(req))
    const combined = `${fingerprint}:${ipHash}`

    const { data, error } = await supabase.rpc('verify_class_password', {
      p_slug: slug,
      p_password: password,
      p_fingerprint: combined,
    })

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: GENERIC_ERROR }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = data as { ok?: boolean; error?: string; token?: string; expires_at?: string }
    const status = result.ok ? 200 : result.error === RATE_ERROR ? 429 : 401
    return new Response(JSON.stringify(result), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ ok: false, error: GENERIC_ERROR }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
