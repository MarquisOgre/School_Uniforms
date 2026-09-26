import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

function userClient(req: Request) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
  )
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const client = userClient(req)
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return json({ error: "Unauthorized" }, 401)

    // The SECURITY DEFINER RPC already performs the admin/super_admin role check.
    // Avoid a separate profiles query on every Settings request.
    const admin = serviceClient()

    if (req.method === "GET") {
      const { data, error } = await admin.rpc("admin_get_razorpay_settings", {
        p_admin_user_id: user.id,
      })
      if (error) return json({ error: error.message }, 500)
      return json(data || {})
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

    const body = await req.json()
    const mode = body?.mode === "live" ? "live" : "test"
    const keyId = String(body?.key_id || "").trim()
    const keySecret = String(body?.key_secret || "").trim()
    const webhookSecret = String(body?.webhook_secret || "").trim()

    const { data, error } = await admin.rpc("admin_save_razorpay_settings", {
      p_admin_user_id: user.id,
      p_mode: mode,
      p_key_id: keyId,
      p_key_secret: keySecret || null,
      p_webhook_secret: webhookSecret || null,
    })

    if (error) return json({ error: error.message }, 400)
    return json(data || {})
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500)
  }
})
