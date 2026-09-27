import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (_req) => {
  return new Response(
    JSON.stringify({ error: "This legacy parent creation endpoint has been retired. Use create-parent-login-v2 with a branch." }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  );
});