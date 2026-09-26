import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })

function client(req: Request) {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  })
}

function service() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
}

function render(value: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (out, [key, val]) => out.split("{{" + key + "}}").join(val ?? ""),
    value,
  )
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const userClient = client(req)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: "Unauthorized" }, 401)

    const body = await req.json()
    const templateKey = String(body?.template_key || "").trim()
    const orderId = String(body?.order_id || "").trim()
    if (!templateKey || !orderId) {
      return json({ error: "template_key and order_id are required" }, 400)
    }

    const admin = service()
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,order_number,customer_user_id,status,grand_total,currency")
      .eq("id", orderId)
      .maybeSingle()

    if (orderError || !order) {
      return json({ error: orderError?.message || "Order not found" }, 404)
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const isAdmin = profile?.role === "admin" || profile?.role === "super_admin"
    if (!isAdmin && order.customer_user_id !== user.id) {
      return json({ error: "Not authorized" }, 403)
    }

    const { data: template, error: templateError } = await admin
      .from("email_templates")
      .select("template_key,name,subject,html_body,text_body,variables,enabled")
      .eq("template_key", templateKey)
      .maybeSingle()

    if (templateError || !template) {
      return json({ error: templateError?.message || "Email template not found" }, 404)
    }

    if (!template.enabled) return json({ skipped: true, reason: "Template disabled" })

    const { data: config, error: configError } = await admin.rpc("service_get_email_config")
    if (configError || !config?.enabled) {
      return json({ skipped: true, reason: configError?.message || "System email is disabled" })
    }
    if (!config?.api_key || !config?.from_email) {
      return json({ skipped: true, reason: "Email provider is not configured" })
    }

    const { data: customer } = await admin.auth.admin.getUserById(order.customer_user_id)
    const to = customer?.user?.email
    if (!to) return json({ error: "Customer email address is not available" }, 422)

    const vars = {
      site_name: "School Uniforms",
      customer_name: customer?.user?.user_metadata?.full_name || "Customer",
      order_number: String(order.order_number || ""),
      order_total: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: order.currency || "INR",
      }).format(Number(order.grand_total || 0)),
      order_url: "https://schooluniforms.vercel.app/",
      login_url: "https://schooluniforms.vercel.app/",
      reset_url: "https://schooluniforms.vercel.app/",
      refund_amount: String(order.grand_total || ""),
    }

    const payload = {
      from: config.from_name ? config.from_name + " <" + config.from_email + ">" : config.from_email,
      to: [to],
      subject: render(String(template.subject || ""), vars),
      html: render(String(template.html_body || ""), vars),
      text: render(String(template.text_body || ""), vars),
      ...(config.reply_to ? { reply_to: config.reply_to } : {}),
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.api_key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    if (!response.ok) {
      return json({ error: result?.message || "Resend rejected the email" }, 502)
    }

    return json({ success: true, email_id: result?.id || null })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500)
  }
})
