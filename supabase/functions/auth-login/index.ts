// Server-side login guard: verifies credentials with Supabase Auth, then
// records failure / resets counters via service_role. This prevents anyone
// from calling record_failed_login directly to DoS other accounts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !emailRegex.test(email) || email.length > 255 || !password || password.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid credentials." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(url, serviceKey);

    // 1. Lockout check (service_role only after hardening)
    const { data: lockData } = await admin.rpc("check_login_attempt", { _email: email });
    const lock = lockData as { locked?: boolean; remaining_seconds?: number } | null;
    const GENERIC = "Invalid login credentials. If you've had several failed attempts, please wait 15 minutes and try again.";
    if (lock?.locked) {
      // Same response as a wrong password so lockout state can't be probed.
      return new Response(JSON.stringify({ error: GENERIC }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Real credential check via anon client (does not persist)
    const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({ email, password });

    if (signInError || !signInData?.session) {
      // 3a. Real failure — bump counter server-side
      await admin.rpc("record_failed_login", { _email: email });
      const msg = GENERIC;
      return new Response(JSON.stringify({ error: msg }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3b. Success — reset counter, return session tokens for client to hydrate
    await admin.rpc("reset_login_attempts", { _email: email });

    return new Response(JSON.stringify({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("auth-login error", e);
    return new Response(JSON.stringify({ error: "Login failed. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
