import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a helpful, friendly customer service AI assistant for Chopa Cosmetics, a beauty products store in Kenya.

## STRICT SCOPE - ONLY answer questions about:
1. Products: cosmetics, skincare, haircare, braids, makeup, perfumes, jewelry, nails, beauty machines
2. Store info: location, hours, contact details
3. Orders: status, tracking, delivery, pickup
4. Payments: M-Pesa, payment methods, refunds
5. Policies: returns, wholesale, delivery fees
6. Website navigation: how to find products, account help, cart issues

## OUT OF SCOPE - Politely redirect these:
- Medical/health advice (beyond basic beauty tips)
- Legal/financial advice
- Politics, religion, controversial topics
- Personal matters unrelated to shopping
- Competitor products/stores
- Technical/programming questions
- Anything unrelated to beauty products or shopping

For out-of-scope questions, respond with:
"I'm here to help with Chopa Cosmetics questions! For [topic], please reach out to the appropriate professional. Is there anything about our products or services I can help you with? 💕"

## CONFIDENCE SIGNALS
If a customer:
- Says "talk to human", "speak to agent", "real person", "customer service" → Add "[HUMAN_REQUESTED]" at the END of your response
- Asks complex order issues, complaints, refunds → Add "[NEEDS_REVIEW]" at the END of your response
- Seems frustrated or upset → Add "[NEEDS_REVIEW]" at the END of your response

## STORE INFORMATION
- Name: Chopa Cosmetics Limited
- Tagline: "Beauty At Your Proximity"
- Locations: 
  * Main: KAKA HOUSE – OTC, Racecourse Road, opposite Kaka Travellers Sacco
  * Thika: Opposite Family Bank
- Hours: 7:30 AM – 9:00 PM daily
- Phone: 0715167179 (James), 0757435912 (Pius)
- Payment: M-Pesa Till 4623226
- Delivery: Free CBD delivery
- Wholesale: Available (6+ items, 10+ for braids)

## STYLE
- Be warm, friendly, professional
- Use emojis occasionally (💕✨🛒)
- Keep responses concise (under 150 words ideally)
- Always offer to help with something else at the end`;

// Phrases that trigger human fallback
const HUMAN_REQUEST_PHRASES = [
  "talk to human",
  "speak to human",
  "real person",
  "customer service",
  "speak to agent",
  "talk to agent",
  "human agent",
  "real agent",
  "speak to someone",
  "talk to someone",
  "actual person",
  "live agent",
  "live chat agent",
  "operator",
  "representative",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { message, userId, conversationHistory } = await req.json();

    // Validate inputs
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId || typeof userId !== "string") {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return new Response(
        JSON.stringify({ error: "Message cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (trimmedMessage.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Message too long. Maximum 1000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for rate limiting checks
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: max 30 messages per minute per user
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentMessages, error: rateError } = await supabase
      .from("chat_messages")
      .select("id")
      .eq("user_id", userId)
      .eq("sender_type", "customer")
      .gte("created_at", oneMinuteAgo);

    if (rateError) {
      console.error("Rate limit check error:", rateError);
    }

    if (recentMessages && recentMessages.length >= 30) {
      console.log("Rate limit exceeded for user:", userId);
      return new Response(
        JSON.stringify({ 
          error: "You're sending messages too quickly. Please wait a moment.",
          rateLimited: true 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if auto-reply is enabled
    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["ai_auto_reply_enabled", "ai_require_admin_approval"]);

    const autoReplyEnabled = settings?.find(s => s.key === "ai_auto_reply_enabled")?.value !== "false";
    const requireApproval = settings?.find(s => s.key === "ai_require_admin_approval")?.value === "true";

    // Check for human request phrases
    const messageLower = trimmedMessage.toLowerCase();
    const humanRequested = HUMAN_REQUEST_PHRASES.some(phrase => messageLower.includes(phrase));

    console.log("Customer chat request:", { userId, autoReplyEnabled, requireApproval, humanRequested });

    // If AI is disabled or approval required, just return a placeholder
    if (!autoReplyEnabled || requireApproval) {
      return new Response(
        JSON.stringify({ 
          reply: "Thank you for your message! Our team will respond shortly. 💕",
          isAiGenerated: false,
          requiresHumanReview: true,
          confidenceScore: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build conversation context (last 10 messages max)
    const validatedHistory = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-10).map(msg => ({
          role: msg.sender_type === "customer" ? "user" : "assistant",
          content: msg.message
        }))
      : [];

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...validatedHistory,
      { role: "user", content: trimmedMessage }
    ];

    // Call AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Service is busy. Please try again in a moment.",
            rateLimited: true
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            reply: "Our chat assistant is temporarily unavailable. Please call us at 0715167179 for immediate help! 💕",
            isAiGenerated: false,
            requiresHumanReview: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || 
      "I'm having trouble responding right now. Please try again or call us at 0715167179! 💕";

    // Check for confidence signals in the response
    const needsReview = reply.includes("[NEEDS_REVIEW]") || reply.includes("[HUMAN_REQUESTED]") || humanRequested;
    
    // Clean up the markers from the response
    reply = reply.replace(/\[HUMAN_REQUESTED\]/g, "").replace(/\[NEEDS_REVIEW\]/g, "").trim();

    // If human was explicitly requested, append a note
    if (humanRequested) {
      reply = "I understand you'd like to speak with someone from our team. I've notified our support staff, and they'll be with you shortly! In the meantime, is there anything I can help you with? 💕";
    }

    // Calculate a simple confidence score
    let confidenceScore = 0.85;
    if (needsReview) confidenceScore = 0.4;
    if (humanRequested) confidenceScore = 0.2;

    console.log("AI reply generated:", { needsReview, humanRequested, confidenceScore });

    return new Response(
      JSON.stringify({ 
        reply,
        isAiGenerated: true,
        requiresHumanReview: needsReview,
        confidenceScore,
        humanRequested
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Customer chat error:", error);
    return new Response(
      JSON.stringify({ 
        reply: "Sorry, I'm having a moment! 😅 Please try again or reach us at 0715167179. We're always happy to help!",
        isAiGenerated: false,
        requiresHumanReview: true,
        confidenceScore: 0
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
