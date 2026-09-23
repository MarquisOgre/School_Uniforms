import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { school_id, branch_id, login_id, password } = await req.json();

    if (
      typeof school_id !== "string" ||
      typeof branch_id !== "string" ||
      typeof login_id !== "string" ||
      typeof password !== "string" ||
      !login_id.trim() ||
      !password
    ) {
      return json({ error: "School, branch, ID and password are required." }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!url || !serviceKey || !anonKey) {
      console.error("Missing Supabase function configuration");
      return json({ error: "Authentication service is not configured." }, 500);
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, full_name, role, school_id, branch_id, status")
      .eq("school_id", school_id)
      .eq("branch_id", branch_id)
      .eq("login_id", login_id.trim())
      .maybeSingle();

    if (profileError || !profile || profile.status !== "active") {
      return json({ error: "Invalid school, branch, ID, or password." }, 401);
    }

    const { data: school } = await admin
      .from("schools")
      .select("id")
      .eq("id", school_id)
      .eq("status", "active")
      .maybeSingle();

    const { data: branch } = await admin
      .from("branches")
      .select("id")
      .eq("id", branch_id)
      .eq("school_id", school_id)
      .eq("status", "active")
      .maybeSingle();

    if (!school || !branch) {
      return json({ error: "Invalid school, branch, ID, or password." }, 401);
    }

    const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.id);

    if (authUserError || !authUser.user?.email) {
      return json({ error: "Invalid school, branch, ID, or password." }, 401);
    }

    const publicClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sessionData, error: signInError } = await publicClient.auth.signInWithPassword({
      email: authUser.user.email,
      password,
    });

    if (signInError || !sessionData.session) {
      return json({ error: "Invalid school, branch, ID, or password." }, 401);
    }

    return json({
      session: sessionData.session,
      user: {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        school_id: profile.school_id,
        branch_id: profile.branch_id,
        login_id: login_id.trim(),
      },
    });
  } catch (error) {
    console.error("student-parent-login error", error);
    return json({ error: "Unable to sign in right now. Please try again." }, 500);
  }
});
