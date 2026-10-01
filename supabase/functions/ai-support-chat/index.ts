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
  branchId?: string
  studentId?: string
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
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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

  const serviceClient = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : createClient(supabaseUrl, supabaseAnonKey)

  let catalogContext = ''
  try {
    const requestedBranchId =
      typeof body.branchId === 'string' && /^[0-9a-f-]{36}$/i.test(body.branchId)
        ? body.branchId
        : null

    const { data: branches } = await serviceClient
      .from('branches')
      .select('id,name,code,status')
      .eq('status', 'active')
      .order('name')

    let studentContext: any = null
    if (typeof body.studentId === 'string' && body.studentId.trim()) {
      const studentQuery = serviceClient
        .from('students')
        .select('id,student_code,full_name,class_name,section,gender,branch_id,status')
        .eq('student_code', body.studentId.trim())
        .eq('status', 'active')
        .limit(5)
      const { data: matchedStudents } = await studentQuery
      const sameBranch = (matchedStudents ?? []).find(
        (student: any) => !body.branchId || student.branch_id === body.branchId,
      )
      if (sameBranch) {
        const studentBranch = (branches ?? []).find((b: any) => b.id === sameBranch.branch_id)
        studentContext = {
          student_code: sameBranch.student_code,
          full_name: sameBranch.full_name,
          class_name: sameBranch.class_name,
          section: sameBranch.section,
          gender: sameBranch.gender,
          branch: studentBranch?.name || studentBranch?.code || sameBranch.branch_id,
          branch_code: studentBranch?.code || null,
        }
      }
    }

    const normalizedMessage = message.toLowerCase()
    const matchedBranch =
      requestedBranchId
        ? (branches ?? []).find((b: any) => b.id === requestedBranchId)
        : (branches ?? []).find((b: any) => {
            const name = String(b.name || '').toLowerCase()
            const code = String(b.code || '').toLowerCase()
            return (
              (name.length >= 3 && normalizedMessage.includes(name)) ||
              (code.length >= 3 && normalizedMessage.includes(code))
            )
          })

    const effectiveBranchId = matchedBranch?.id ?? null

    const { data: products } = await serviceClient
      .from('products')
      .select('id,name,description,base_price,offer_price,discount_percentage,product_type,gender,material,brand,quality,fabric,cod_available,easy_returns,express_shipping,branch_id')
      .eq('status', 'active')
      .order('name')
      .limit(120)

    const { data: variants } = await serviceClient
      .from('product_variants')
      .select('id,product_id,sku,size_label,color,variant_name,price,status')
      .eq('status', 'active')
      .limit(500)

    const { data: packages } = await serviceClient
      .from('uniform_packages')
      .select('id,name,description,base_price,offer_price,discount_percentage,gender,branch_id')
      .eq('status', 'active')
      .order('name')
      .limit(60)

    let branchProducts: any[] = []
    let inventory: any[] = []
    let branchPackages: any[] = []

    if (effectiveBranchId) {
      const [bp, bi, bpk] = await Promise.all([
        serviceClient
          .from('branch_products')
          .select('branch_id,product_id,branch_price,is_visible,sort_order')
          .eq('branch_id', effectiveBranchId)
          .eq('is_visible', true)
          .order('sort_order'),
        serviceClient
          .from('branch_inventory')
          .select('branch_id,product_id,variant_id,quantity_on_hand,reorder_level')
          .eq('branch_id', effectiveBranchId),
        serviceClient
          .from('branch_packages')
          .select('package_id,branch_price,is_visible')
          .eq('branch_id', effectiveBranchId)
          .eq('is_visible', true),
      ])
      branchProducts = bp.data ?? []
      inventory = bi.data ?? []
      branchPackages = bpk.data ?? []
    } else {
      // Visitors may ask about stock before selecting a branch. Load inventory
      // across active branches so the assistant can answer with the branch name
      // instead of incorrectly claiming that inventory is unavailable.
      const { data: allInventory } = await serviceClient
        .from('branch_inventory')
        .select('branch_id,product_id,variant_id,quantity_on_hand,reorder_level')
        .gt('quantity_on_hand', 0)
        .limit(2000)
      inventory = allInventory ?? []
    }

    const productById = new Map((products ?? []).map((p: any) => [p.id, p]))
    const packageById = new Map((packages ?? []).map((p: any) => [p.id, p]))
    const variantById = new Map((variants ?? []).map((v: any) => [v.id, v]))
    const variantsByProduct = new Map<string, any[]>()

    for (const variant of variants ?? []) {
      const list = variantsByProduct.get(variant.product_id) ?? []
      list.push(variant)
      variantsByProduct.set(variant.product_id, list)
    }

    const visibleProducts = effectiveBranchId && branchProducts.length
      ? branchProducts
          .map((bp: any) => {
            const p = productById.get(bp.product_id)
            return p ? { ...p, branch_price: bp.branch_price } : null
          })
          .filter(Boolean)
      : (products ?? [])

    const visiblePackages = effectiveBranchId && branchPackages.length
      ? branchPackages
          .map((bp: any) => {
            const p = packageById.get(bp.package_id)
            return p ? { ...p, branch_price: bp.branch_price } : null
          })
          .filter(Boolean)
      : (packages ?? [])

    const inventoryByVariant = new Map<string, number>()
    for (const row of inventory) {
      inventoryByVariant.set(row.variant_id, Number(row.quantity_on_hand || 0))
    }

    const wantsAvailability =
      /stock|available|availability|in stock|quantity|size|sizes|sock/.test(normalizedMessage)

    const productContext = visibleProducts.slice(0, 100).map((p: any) => ({
      name: p.name,
      description: p.description,
      price: p.branch_price ?? p.offer_price ?? p.base_price,
      product_type: p.product_type,
      gender: p.gender,
      material: p.material,
      brand: p.brand,
      quality: p.quality,
      fabric: p.fabric,
      cod_available: p.cod_available,
      easy_returns: p.easy_returns,
      express_shipping: p.express_shipping,
      variants: (variantsByProduct.get(p.id) ?? []).map((v: any) => ({
        size: v.size_label,
        color: v.color,
        name: v.variant_name,
        price: v.price,
        ...(wantsAvailability && effectiveBranchId
          ? { quantity_on_hand: inventoryByVariant.get(v.id) ?? 0 }
          : {}),
      })),
    }))

    const packageContext = visiblePackages.slice(0, 40).map((p: any) => ({
      name: p.name,
      description: p.description,
      price: p.branch_price ?? p.offer_price ?? p.base_price,
      gender: p.gender,
    }))

    const availabilityContext = inventory
      .map((row: any) => {
        const variant = variantById.get(row.variant_id)
        const product = variant ? productById.get(variant.product_id) : null
        const branch = (branches ?? []).find((b: any) => b.id === row.branch_id)
        if (!variant || !product) return null
        return {
          branch: branch?.name || row.branch_id,
          branch_code: branch?.code || null,
          product: product.name,
          variant: variant.variant_name || variant.size_label || variant.id,
          size: variant.size_label,
          color: variant.color,
          quantity_on_hand: Number(row.quantity_on_hand || 0),
        }
      })
      .filter(Boolean)

    catalogContext = [
      effectiveBranchId
        ? `Resolved branch: ${matchedBranch?.name || 'selected branch'} (${matchedBranch?.code || ''}).`
        : 'No branch was resolved from the current visitor request.',
      studentContext ? 'Authenticated portal student context (use this to personalize school/class/section answers):' : '',
      studentContext ? JSON.stringify(studentContext) : '',
      'Use the following live application catalog context:',
      JSON.stringify({
        products: productContext,
        uniform_packages: packageContext,
        exact_variant_inventory: availabilityContext,
      }),
    ].join('\n')
  } catch {
    catalogContext = ''
  }

  const systemPrompt = [
    'You are the School UniformsDirect AI Support Assistant.',
    'Help customers with school uniforms, products, packages, ordering, shipping, returns, payments, and general platform questions.',
    'Be friendly, concise, and practical.',
    'Do not invent product prices, stock levels, school-specific package details, order details, or policies that are not provided in the conversation or retrieved from the application.',
    'Never reveal private customer information or another customer’s order details.',
    'The live application catalog context below is authoritative for product, variant, package, branch, and inventory questions.',
    'If earlier conversation messages claim that live catalog or inventory is unavailable, ignore that claim when the current catalog context contains the requested information.',
    'For stock questions, use the exact_variant_inventory values supplied for the matching branch and variant. A positive quantity means the variant is currently in stock; zero means out of stock. If no branch was selected, use the branch field in the inventory records and tell the customer which branch the stock belongs to.',
    'When answering a size or availability question, list EVERY matching size/variant explicitly from exact_variant_inventory. Never omit a size, never summarize a complete list as a shortened range, and never infer missing sizes.',
    'If the data contains sizes 2, 3, 4, 5, and 6, your answer must explicitly write Size 2, Size 3, Size 4, Size 5, and Size 6.',
    'If a customer names a school or branch that is not an exact branch name, use the resolved branch context when one is supplied; do not ask them to repeat the product name if it is already clear.',
    'For account-specific questions that require private customer data, explain that authentication or human support is required.',
    'When uncertain, say so and offer human support rather than guessing.',
    '',
    catalogContext,
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
