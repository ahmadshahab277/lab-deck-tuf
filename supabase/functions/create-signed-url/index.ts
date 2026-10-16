import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-class-session',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Server is not configured.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json() as { resource_id?: string }
    const resourceId = body.resource_id
    if (!resourceId) {
      return new Response(JSON.stringify({ ok: false, error: 'Resource is not available.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const classToken = req.headers.get('x-class-session')
    const authHeader = req.headers.get('authorization')
    const service = createClient(supabaseUrl, serviceKey)

    let storagePath: string | null = null
    let fileName = 'download'

    if (classToken) {
      const { data } = await service.rpc('student_authorized_resource_path', {
        p_token: classToken,
        p_resource_id: resourceId,
      })
      const result = data as { ok?: boolean; storage_path?: string; file_name?: string } | null
      if (result?.ok && result.storage_path) {
        storagePath = result.storage_path
        fileName = result.file_name || fileName
      }
    } else if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: adminCheck } = await userClient.rpc('is_admin')
      if (adminCheck === true) {
        const { data: resource } = await service
          .from('resources')
          .select('storage_path, file_name')
          .eq('id', resourceId)
          .maybeSingle()
        storagePath = resource?.storage_path ?? null
        fileName = resource?.file_name || fileName
      }
    }

    if (!storagePath) {
      return new Response(JSON.stringify({ ok: false, error: 'Resource is not available.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await service.storage
      .from('class-files')
      .createSignedUrl(storagePath, 180, { download: fileName })

    if (error || !data?.signedUrl) {
      return new Response(JSON.stringify({ ok: false, error: 'Download is not available.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, url: data.signedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Download is not available.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
