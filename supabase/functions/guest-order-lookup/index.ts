import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing backend configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId, orderToken } = body;

    // Validate inputs
    if (!orderId || typeof orderId !== "string") {
      console.log("Invalid order ID provided");
      return new Response(JSON.stringify({ error: "Invalid order ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orderToken || typeof orderToken !== "string") {
      console.log("Invalid order token provided");
      return new Response(JSON.stringify({ error: "Invalid order token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      console.log("Order ID is not a valid UUID");
      return new Response(JSON.stringify({ error: "Invalid order ID format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("x-real-ip") ||
                     req.headers.get("cf-connecting-ip") ||
                     "unknown";

    console.log(`Guest order lookup attempt from IP: ${clientIp.substring(0, 10)}... for order: ${orderId.substring(0, 8)}...`);

    // Create service role client for rate limiting (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check rate limit (10 attempts per hour per IP)
    const { data: isAllowed, error: rateLimitError } = await supabase.rpc(
      "check_guest_order_rate_limit",
      {
        _ip_address: clientIp,
        _order_id: orderId,
        _max_attempts: 10,
        _window_minutes: 60,
      }
    );

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      return new Response(
        JSON.stringify({ error: "Unable to process request" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!isAllowed) {
      console.log(`Rate limit exceeded for IP: ${clientIp.substring(0, 10)}...`);
      return new Response(
        JSON.stringify({ 
          error: "Too many requests. Please try again later.",
          retryAfter: 3600 
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "3600"
          },
        },
      );
    }

    // Call the existing get_guest_order function
    const { data: orderData, error: orderError } = await supabase.rpc(
      "get_guest_order",
      {
        _order_id: orderId,
        _order_token: orderToken,
      }
    );

    if (orderError) {
      console.error("Order lookup error:", orderError);
      return new Response(
        JSON.stringify({ error: "Unable to retrieve order" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if order was found
    if (!orderData || orderData.length === 0) {
      console.log(`Order not found or invalid token for order: ${orderId.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({ error: "Order not found or invalid tracking link" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Mark the lookup as successful
    await supabase.rpc("mark_guest_order_lookup_success", {
      _ip_address: clientIp,
      _order_id: orderId,
    });

    console.log(`Successful order lookup for order: ${orderId.substring(0, 8)}...`);

    // Return the order data (first result since get_guest_order returns SETOF)
    return new Response(
      JSON.stringify({ order: orderData[0] }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );

  } catch (error) {
    console.error("Guest order lookup error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
