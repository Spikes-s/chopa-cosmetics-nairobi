// Admin-only: send an email campaign to all active VIP members via Resend
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import DOMPurify from "https://esm.sh/isomorphic-dompurify@2.16.0";

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ["p", "h1", "h2", "h3", "a", "b", "strong", "i", "em", "br", "ul", "ol", "li", "img", "span", "div"],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "style", "target", "rel"],
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = "Chopa Cosmetics <onboarding@resend.dev>"; // change to verified domain once set up

function wrapHtml(bodyHtml: string, unsubscribeUrl: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#fff5f7;font-family:-apple-system,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);">
        <tr><td style="background:linear-gradient(135deg,#ec4899,#f59e0b);padding:28px;text-align:center;color:#fff;">
          <div style="font-size:26px;font-weight:700;letter-spacing:.5px;">Chopa Cosmetics</div>
          <div style="font-size:13px;opacity:.95;margin-top:4px;">Beauty At Your Proximity 💖</div>
        </td></tr>
        <tr><td style="padding:28px;color:#2b1b22;font-size:15px;line-height:1.6;">${bodyHtml}</td></tr>
        <tr><td style="padding:20px 28px;background:#fff5f7;color:#7a5560;font-size:12px;text-align:center;">
          You're receiving this because you joined Chopa VIP Membership.<br>
          <a href="${unsubscribeUrl}" style="color:#c2185b;">Unsubscribe</a> · Chopa Cosmetics Limited, Nairobi
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!RESEND_KEY) {
      return new Response(JSON.stringify({ error: "Email provider not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isSuper } = await supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" });
    if (!isAdmin && !isSuper) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, body_html, body_text, prompt_used, coupon_id } = await req.json();
    if (!subject || !body_html) {
      return new Response(JSON.stringify({ error: "Subject and body required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: members, error: membersErr } = await supabase
      .from("vip_members")
      .select("email, unsubscribe_token")
      .eq("status", "active");

    if (membersErr) {
      return new Response(JSON.stringify({ error: membersErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: campaign } = await supabase
      .from("vip_email_campaigns")
      .insert({
        subject, body_html, body_text, prompt_used, coupon_id: coupon_id || null,
        sent_by: user.id, status: "sending", recipient_count: members?.length || 0,
      })
      .select("id").single();

    const baseUnsub = `${Deno.env.get("SUPABASE_URL")}/functions/v1/vip-unsubscribe?token=`;
    let delivered = 0, failed = 0;

    for (const m of members || []) {
      const html = wrapHtml(body_html, `${baseUnsub}${m.unsubscribe_token}`);
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from: FROM, to: [m.email], subject,
            html, text: body_text || subject,
            headers: { "List-Unsubscribe": `<${baseUnsub}${m.unsubscribe_token}>` },
          }),
        });
        const ok = resp.ok;
        const err = ok ? null : await resp.text();
        await supabase.from("vip_campaign_recipients").insert({
          campaign_id: campaign!.id, email: m.email,
          status: ok ? "sent" : "failed", error_message: err, sent_at: ok ? new Date().toISOString() : null,
        });
        if (ok) {
          delivered++;
          await supabase.from("vip_members").update({ last_email_sent_at: new Date().toISOString() }).eq("email", m.email);
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
        await supabase.from("vip_campaign_recipients").insert({
          campaign_id: campaign!.id, email: m.email, status: "failed", error_message: String(e),
        });
      }
    }

    await supabase.from("vip_email_campaigns").update({
      status: failed === (members?.length || 0) && (members?.length || 0) > 0 ? "failed" : "sent",
      sent_at: new Date().toISOString(), delivered_count: delivered, failed_count: failed,
    }).eq("id", campaign!.id);

    return new Response(JSON.stringify({ success: true, delivered, failed, total: members?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vip-send-campaign", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
