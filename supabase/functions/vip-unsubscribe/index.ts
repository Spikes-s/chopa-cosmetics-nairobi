// One-click unsubscribe via signed token from email footers
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const html = (msg: string, ok = true) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chopa VIP – Unsubscribe</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#fff5f7;color:#2b1b22;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#fff;padding:2.5rem;border-radius:1rem;box-shadow:0 10px 40px rgba(0,0,0,0.08);max-width:420px;text-align:center}
h1{color:${ok ? "#c2185b" : "#b91c1c"};font-size:1.25rem;margin:0 0 .75rem}p{margin:0;color:#555}</style></head>
<body><div class="card"><h1>${ok ? "Unsubscribed 💖" : "Unable to unsubscribe"}</h1><p>${msg}</p></div></body></html>`;

  if (!token) {
    return new Response(html("Missing token.", false), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("vip_members")
    .update({ status: "unsubscribed" })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();

  if (error || !data) {
    return new Response(html("Invalid or expired link.", false), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  return new Response(
    html(`${data.email} has been removed from VIP marketing emails. You can rejoin anytime from our homepage.`),
    { headers: { ...corsHeaders, "Content-Type": "text/html" } },
  );
});
