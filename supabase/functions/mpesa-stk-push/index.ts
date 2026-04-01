
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SANDBOX_URL = "https://sandbox.safaricom.co.ke";
const SHORTCODE = "174379";
const PASSKEY = "bfb279f9aa9312c2f58bd02dee1173563da9e92b17b47f075db26e53dbe2e069";
// Note: This is Safaricom's publicly published sandbox passkey

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone_number, amount } = await req.json();

    // Validate phone number (must be 254XXXXXXXXX)
    const phoneRegex = /^254[17]\d{8}$/;
    if (!phone_number || !phoneRegex.test(phone_number)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number. Use format 254XXXXXXXXX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amount
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount < 1 || parsedAmount > 500000) {
      return new Response(
        JSON.stringify({ error: "Invalid amount. Must be between 1 and 500,000" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OAuth token
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");

    if (!consumerKey || !consumerSecret) {
      console.error("M-PESA credentials not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authString = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch(
      `${SANDBOX_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: { Authorization: `Basic ${authString}` },
      }
    );

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error("OAuth token error:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with payment provider" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Generate timestamp and password
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`);

    // Build callback URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${supabaseUrl}/functions/v1/mpesa-callback`;

    // Send STK Push request
    const stkResponse = await fetch(
      `${SANDBOX_URL}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.round(parsedAmount),
          PartyA: phone_number,
          PartyB: SHORTCODE,
          PhoneNumber: phone_number,
          CallBackURL: callbackUrl,
          AccountReference: "CHOPA COSMETICS",
          TransactionDesc: "Payment for order",
        }),
      }
    );

    const stkResult = await stkResponse.json();
    console.log("STK Push response:", JSON.stringify(stkResult));

    if (stkResult.ResponseCode !== "0") {
      return new Response(
        JSON.stringify({
          error: stkResult.errorMessage || stkResult.ResponseDescription || "STK Push failed",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store transaction in database using service role
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await supabase
      .from("mpesa_transactions")
      .insert({
        checkout_request_id: stkResult.CheckoutRequestID,
        merchant_request_id: stkResult.MerchantRequestID,
        phone_number,
        amount: parsedAmount,
        status: "pending",
      });

    if (insertError) {
      console.error("DB insert error:", insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_request_id: stkResult.CheckoutRequestID,
        message: "STK Push sent. Check your phone for the M-PESA prompt.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("STK Push error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
