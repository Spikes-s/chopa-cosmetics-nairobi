
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("M-PESA Callback received:", JSON.stringify(body));

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      console.error("Invalid callback payload - missing stkCallback");
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
    } = stkCallback;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (ResultCode === 0) {
      // Payment successful - extract receipt number from CallbackMetadata
      let mpesaReceiptNumber = "";
      const metadata = stkCallback.CallbackMetadata?.Item;
      if (Array.isArray(metadata)) {
        const receiptItem = metadata.find(
          (item: { Name: string }) => item.Name === "MpesaReceiptNumber"
        );
        if (receiptItem) {
          mpesaReceiptNumber = receiptItem.Value;
        }
      }

      const { error } = await supabase
        .from("mpesa_transactions")
        .update({
          status: "completed",
          result_code: ResultCode,
          result_desc: ResultDesc,
          mpesa_receipt_number: mpesaReceiptNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("checkout_request_id", CheckoutRequestID);

      if (error) {
        console.error("DB update error (success):", error);
      } else {
        console.log(`Transaction ${CheckoutRequestID} completed. Receipt: ${mpesaReceiptNumber}`);
      }
    } else {
      // Payment failed or cancelled
      const { error } = await supabase
        .from("mpesa_transactions")
        .update({
          status: ResultCode === 1032 ? "cancelled" : "failed",
          result_code: ResultCode,
          result_desc: ResultDesc,
          updated_at: new Date().toISOString(),
        })
        .eq("checkout_request_id", CheckoutRequestID);

      if (error) {
        console.error("DB update error (failure):", error);
      } else {
        console.log(`Transaction ${CheckoutRequestID} failed/cancelled: ${ResultDesc}`);
      }
    }

    // Safaricom expects this response format
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Callback processing error:", err);
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
});
