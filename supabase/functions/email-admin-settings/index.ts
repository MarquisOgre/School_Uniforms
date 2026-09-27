import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })

function userClient(req: Request) {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  })
}

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const client = userClient(req)
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return json({ error: "Unauthorized" }, 401)

    const admin = serviceClient()

    if (req.method === "GET") {
      const { data, error } = await admin.rpc("admin_get_email_config", { p_admin_user_id: user.id })
      if (error) return json({ error: error.message }, 500)
      return json(data || {})
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

    const body = await req.json()
    const { data, error } = await admin.rpc("admin_save_email_config", {
      p_admin_user_id: user.id,
      p_provider: "resend",
      p_from_name: String(body?.from_name || "School Uniforms"),
      p_from_email: String(body?.from_email || ""),
      p_reply_to: String(body?.reply_to || "") || null,
      p_api_key: String(body?.api_key || "") || null,
      p_enabled: body?.enabled !== false,
    })

    if (error) return json({ error: error.message }, 400)
    return json(data || {})
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500)
  }
})
