// Admin-only: use Lovable AI to turn rough instructions into a polished VIP email
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isSuper } = await supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" });
    if (!isAdmin && !isSuper) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, coupon } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const couponBlurb = coupon
      ? `\n\nIMPORTANT: include this exclusive VIP coupon prominently in the email:
- Code: ${coupon.code}
- Discount: ${coupon.discount_percent}% off
- Valid until: ${new Date(coupon.expires_at).toLocaleDateString("en-KE", { dateStyle: "long" })}`
      : "";

    const systemPrompt = `You are a beauty marketing copywriter for Chopa Cosmetics Limited, a Kenyan cosmetics brand whose motto is "Beauty At Your Proximity". You write warm, friendly, conversational marketing emails to VIP members. Tone: feminine, uplifting, beauty-focused (lotions, skincare, makeup, hair extensions). Always use "Hello Beautiful" or similar warm greeting. Always close with "With love, The Chopa Family 💖". All prices are in Kenyan Shillings (Ksh). Keep emails concise — 120-220 words. Output STRICT JSON with keys: subject (string, <=70 chars), body_text (plain text), body_html (clean inline-styled HTML body markup only, no <html>/<head>/<body> tags, use <p>, <h2>, <a>, soft pink #ec4899 / gold #f59e0b accents).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Marketing instruction from admin:\n"""${prompt}"""${couponBlurb}\n\nReturn only the JSON object.` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI error", aiResp.status, text);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { subject?: string; body_text?: string; body_html?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { subject: "Chopa VIP Update", body_text: content, body_html: `<p>${content}</p>` };
    }

    return new Response(JSON.stringify({
      subject: parsed.subject || "Chopa VIP Update",
      body_text: parsed.body_text || "",
      body_html: parsed.body_html || `<p>${parsed.body_text || ""}</p>`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("vip-generate-email", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
