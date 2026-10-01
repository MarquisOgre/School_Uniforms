import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type RequestBody = {
  conversationId?: string
  message: string
  history?: ChatMessage[]
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!openRouterKey || !supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'AI support is not configured on the server.' }, 500)
  }

  // Authentication is optional: visitors can use the AI assistant before logging in.
  // If a valid customer session is supplied, it is returned for the persistent
  // branch conversation flow, but the AI response itself does not require an account.
  const authHeader = req.headers.get('Authorization')
  let userId: string | null = null
  if (authHeader) {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await userClient.auth.getUser()
    userId = userData?.user?.id ?? null
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON request.' }, 400)
  }

  const message = body.message?.trim()
  if (!message) return json({ error: 'Message is required.' }, 400)
  if (message.length > 1000) return json({ error: 'Message is too long.' }, 400)

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is ChatMessage =>
            item &&
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item.content === 'string',
        )
        .slice(-8)
    : []

  const systemPrompt = [
    'You are the School UniformsDirect AI Support Assistant.',
    'Help customers with school uniforms, products, packages, ordering, shipping, returns, payments, and general platform questions.',
    'Be friendly, concise, and practical.',
    'Do not invent product prices, stock levels, school-specific package details, order details, or policies that are not provided in the conversation or retrieved from the application.',
    'Never reveal private customer information or another customer’s order details.',
    'For account-specific questions that require application data, explain that the live application data is not yet available to the AI unless such data is supplied in the prompt.',
    'When uncertain, say so and offer human support rather than guessing.',
  ].join('\n')

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ]

  const model = Deno.env.get('OPENROUTER_MODEL') || 'openrouter/free'

  let aiResponse: Response
  try {
    aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('OPENROUTER_SITE_URL') || 'https://school-uniforms-directly.vercel.app',
        'X-Title': 'School UniformsDirect AI Support',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 500,
      }),
    })
  } catch {
    return json({ error: 'Unable to reach the AI provider. Please try again.' }, 502)
  }

  const raw = await aiResponse.text()
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = null
  }

  if (!aiResponse.ok) {
    return json(
      {
        error:
          parsed?.error?.message ||
          'The AI provider returned an error. Please try again.',
      },
      aiResponse.status >= 400 && aiResponse.status < 500 ? aiResponse.status : 502,
    )
  }

  const reply = parsed?.choices?.[0]?.message?.content
  if (typeof reply !== 'string' || !reply.trim()) {
    return json({ error: 'The AI provider returned an empty response.' }, 502)
  }

  return json({
    reply: reply.trim(),
    model,
    conversationId: body.conversationId || null,
    userId,
  })
})
