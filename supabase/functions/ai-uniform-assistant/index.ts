import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Body = {
  branchId: string
  message: string
  className?: string | null
  gender?: 'boys' | 'girls' | 'unisex' | null
  productQuery?: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = (await req.json()) as Body
    if (!body.branchId || !body.message?.trim()) {
      return Response.json({ error: 'branchId and message are required' }, { status: 400, headers: cors })
    }

    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    const serviceKey = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

    const className = body.className?.trim() || null
    let catalog: any[] = []
    if (className) {
      const { data, error } = await supabase.rpc('get_uniform_ai_catalog', {
        p_branch_id: body.branchId,
        p_class_name: className,
        p_gender: body.gender ?? null,
        p_product_query: body.productQuery ?? null,
      })
      if (error) throw error
      catalog = data ?? []
    }

    const provider = (Deno.env.get('AI_PROVIDER') || 'openrouter').toLowerCase()
    const apiKey = provider === 'openai'
      ? Deno.env.get('OPENAI_API_KEY')
      : Deno.env.get('OPENROUTER_API_KEY')
    const endpoint = provider === 'openai'
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions'
    const model = Deno.env.get('AI_MODEL') || (provider === 'openai' ? 'gpt-4o-mini' : 'openrouter/free')

    if (!apiKey) {
      return Response.json({
        error: 'AI provider is not configured.',
        needsSetup: true,
      }, { status: 503, headers: cors })
    }

    const system = `You are the School Uniform AI Assistant.
Your job is to help parents identify the correct uniform products and sizes.
Never invent a product, class mapping, size, stock quantity, or measurement.
Use only the supplied catalog data.
Class determines which products are eligible; measurements determine size.
If the class is missing, ask for the class.
If measurements are missing and a reliable size cannot be selected, ask for the relevant measurement (for example chest for a shirt, waist for trousers/skirt, foot length for shoes).
Only recommend a variant when it exists in the supplied catalog and quantity_on_hand is greater than zero.
If measurement ranges are absent, say that the school size chart has not been configured yet rather than guessing.
Explain recommendations briefly and mention that final fit can vary by garment.
Catalog JSON follows:${JSON.stringify(catalog)}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'openrouter' ? {
          'HTTP-Referer': 'https://artisanapparels.vercel.app',
          'X-Title': 'School Uniforms AI Assistant',
        } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: body.message.trim() },
        ],
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      return Response.json({ error: result?.error?.message || 'AI request failed' }, { status: response.status, headers: cors })
    }

    return Response.json({
      reply: result?.choices?.[0]?.message?.content || 'I could not generate a response.',
      catalogCount: catalog.length,
      provider,
      model,
    }, { headers: cors })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500, headers: cors })
  }
})
