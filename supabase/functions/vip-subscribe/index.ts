// Paid VIP subscription — submits M-Pesa Till payment for admin verification
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const mpesaRegex = /^[A-Z0-9]{8,15}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const full_name = body.full_name ? String(body.full_name).trim().slice(0, 100) : null;
    const phone = body.phone ? String(body.phone).trim().slice(0, 20) : null;
    const plan_slug = String(body.plan_slug || "").trim().toLowerCase();
    const mpesa_code = String(body.mpesa_code || "").trim().toUpperCase();
    const honeypot = body.website;

    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !emailRegex.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Please enter a valid email address." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!plan_slug) {
      return new Response(JSON.stringify({ error: "Please select a VIP plan." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!mpesa_code || !mpesaRegex.test(mpesa_code)) {
      return new Response(JSON.stringify({ error: "Please enter a valid M-Pesa transaction code." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: plan, error: planErr } = await supabase
      .from("vip_plans")
      .select("id, slug, name, price_ksh, duration_days, is_active")
      .eq("slug", plan_slug)
      .maybeSingle();

    if (planErr || !plan || !plan.is_active) {
      return new Response(JSON.stringify({ error: "Selected plan is unavailable." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reject duplicate M-Pesa codes
    const { data: dupCode } = await supabase
      .from("vip_members")
      .select("id")
      .eq("mpesa_code", mpesa_code)
      .maybeSingle();
    if (dupCode) {
      return new Response(JSON.stringify({ error: "This M-Pesa code has already been used." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("vip_members")
      .select("id, payment_status, tier")
      .eq("email", email)
      .maybeSingle();

    const patch = {
      full_name,
      phone,
      plan_id: plan.id,
      tier: plan.slug,
      payment_status: "pending",
      mpesa_code,
      status: "active",
      source: "paid_signup",
    };

    if (existing) {
      if (existing.payment_status === "paid") {
        return new Response(JSON.stringify({
          success: false, already: true,
          message: `You are already a ${existing.tier?.toUpperCase()} VIP member.`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await supabase.from("vip_members").update(patch).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("vip_members").insert({ email, ...patch });
      if (error) throw error;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Payment submitted for ${plan.name}. We'll activate your membership within 24 hours after verifying your M-Pesa code.`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("vip-subscribe error", e);
    return new Response(JSON.stringify({ error: "Could not submit. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
