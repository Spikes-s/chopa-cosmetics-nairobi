import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: "Chopa VIP <vip@chopacosmetics.com>", to: [to], subject, html }),
    });
  } catch (e) { console.warn("email failed", e); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET");

  // Auth: require either a matching CRON_SECRET header (for scheduled invocations)
  // or an authenticated admin/super_admin user.
  const providedSecret = req.headers.get("x-cron-secret");
  let authorized = false;

  if (cronSecret && providedSecret && providedSecret === cronSecret) {
    authorized = true;
  } else {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
        const { data: isSuper } = await userClient.rpc("has_role", { _user_id: user.id, _role: "super_admin" });
        if (isAdmin || isSuper) authorized = true;
      }
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, key);
  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString();

  // 1. Send reminders for members expiring within 7 days
  const { data: expiring } = await supabase
    .from("vip_members")
    .select("id,email,name,tier,paid_until")
    .eq("status", "active")
    .neq("tier", "free")
    .lte("paid_until", in7Days)
    .gt("paid_until", now.toISOString());

  let reminded = 0;
  for (const m of expiring ?? []) {
    const daysLeft = Math.ceil((new Date(m.paid_until).getTime() - now.getTime()) / 86400000);
    await sendEmail(m.email, `Your Chopa VIP ${m.tier} expires in ${daysLeft} days`,
      `<div style="font-family:sans-serif;padding:24px"><h2 style="color:#d4af37">Hi ${m.name || 'VIP'} 💎</h2>
       <p>Your <b>Chopa ${m.tier.toUpperCase()}</b> membership expires in <b>${daysLeft} days</b>.</p>
       <p>Renew now to keep your exclusive perks, wholesale pricing, and monthly coupons.</p>
       <a href="https://chopacosmetics.lovable.app" style="display:inline-block;padding:12px 24px;background:#d4af37;color:#fff;border-radius:8px;text-decoration:none">Renew VIP</a></div>`);
    reminded++;
  }

  // 2. Downgrade expired paid members
  const { data: expired } = await supabase
    .from("vip_members")
    .select("id,email,name,tier")
    .eq("status", "active")
    .neq("tier", "free")
    .lte("paid_until", now.toISOString());

  let downgraded = 0;
  for (const m of expired ?? []) {
    await supabase.from("vip_members").update({
      tier: "free", payment_status: "expired", paid_until: null,
    }).eq("id", m.id);
    await sendEmail(m.email, "Your Chopa VIP has expired",
      `<div style="font-family:sans-serif;padding:24px"><h2>Hi ${m.name || 'there'} 💔</h2>
       <p>Your <b>${m.tier.toUpperCase()}</b> membership has expired. You've been moved to our Free tier.</p>
       <p>Renew any time to unlock your VIP perks again.</p></div>`);
    downgraded++;
  }

  return new Response(JSON.stringify({ success: true, reminded, downgraded }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
