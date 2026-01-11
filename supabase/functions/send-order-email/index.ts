import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  orderId: string;
  emailType: 'order_placed' | 'payment_confirmed' | 'order_ready' | 'order_completed';
}

interface OrderData {
  id: string;
  customer_name: string;
  customer_email: string | null;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  delivery_type: string;
  mpesa_code: string | null;
  user_id: string | null;
}

const getEmailContent = (order: OrderData, emailType: string) => {
  const itemsList = order.items
    .map(item => `<li>${item.quantity}x ${item.name} - Ksh ${item.price.toLocaleString()}</li>`)
    .join('');

  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #ec4899, #a855f7); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
      .content { background: #fafafa; padding: 30px; border: 1px solid #e5e5e5; }
      .footer { background: #1a1a1a; color: #888; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
      .order-id { background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace; }
      .total { font-size: 24px; color: #ec4899; font-weight: bold; }
      ul { padding-left: 20px; }
    </style>
  `;

  switch (emailType) {
    case 'order_placed':
      return {
        subject: `Order Received - ${order.id.slice(0, 8)}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>Thank You for Your Order!</h1>
            </div>
            <div class="content">
              <p>Hi ${order.customer_name},</p>
              <p>We've received your order and it's being processed.</p>
              <p class="order-id">Order ID: ${order.id.slice(0, 8)}</p>
              ${order.mpesa_code ? `<p><strong>M-Pesa Code:</strong> ${order.mpesa_code}</p>` : ''}
              <h3>Order Details:</h3>
              <ul>${itemsList}</ul>
              <p class="total">Total: Ksh ${order.total.toLocaleString()}</p>
              <p><strong>Delivery Method:</strong> ${order.delivery_type === 'delivery' ? 'Delivery' : 'Store Pickup'}</p>
              <p>We'll notify you once your payment is confirmed.</p>
            </div>
            <div class="footer">
              <p>Chopa Beauty - Your Beauty Destination</p>
            </div>
          </div>
        `,
      };

    case 'payment_confirmed':
      return {
        subject: `Payment Confirmed - Order ${order.id.slice(0, 8)}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>Payment Confirmed! ✓</h1>
            </div>
            <div class="content">
              <p>Hi ${order.customer_name},</p>
              <p>Your payment of <span class="total">Ksh ${order.total.toLocaleString()}</span> has been confirmed.</p>
              <p class="order-id">Order ID: ${order.id.slice(0, 8)}</p>
              <p>Your order is now being prepared. We'll notify you when it's ready!</p>
            </div>
            <div class="footer">
              <p>Chopa Beauty - Your Beauty Destination</p>
            </div>
          </div>
        `,
      };

    case 'order_ready':
      return {
        subject: `Order Ready - ${order.id.slice(0, 8)}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>Your Order is Ready! 🎉</h1>
            </div>
            <div class="content">
              <p>Hi ${order.customer_name},</p>
              <p>Great news! Your order is ready ${order.delivery_type === 'delivery' ? 'for delivery' : 'for pickup at our store'}.</p>
              <p class="order-id">Order ID: ${order.id.slice(0, 8)}</p>
              ${order.delivery_type === 'pickup' ? '<p><strong>Location:</strong> KAKA HOUSE</p><p><strong>Hours:</strong> 7:30 AM – 9:00 PM</p>' : '<p>Our delivery team will contact you shortly.</p>'}
            </div>
            <div class="footer">
              <p>Chopa Beauty - Your Beauty Destination</p>
            </div>
          </div>
        `,
      };

    case 'order_completed':
      return {
        subject: `Order Complete - Thank You! ${order.id.slice(0, 8)}`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>Order Complete! 💖</h1>
            </div>
            <div class="content">
              <p>Hi ${order.customer_name},</p>
              <p>Your order has been completed successfully. Thank you for shopping with us!</p>
              <p class="order-id">Order ID: ${order.id.slice(0, 8)}</p>
              <p>We hope you love your products. See you again soon!</p>
            </div>
            <div class="footer">
              <p>Chopa Beauty - Your Beauty Destination</p>
            </div>
          </div>
        `,
      };

    default:
      return null;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's auth token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse and validate request
    const requestData: OrderEmailRequest = await req.json();

    // Validate orderId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!requestData.orderId || !uuidRegex.test(requestData.orderId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid order ID format' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email type
    const validEmailTypes = ['order_placed', 'payment_confirmed', 'order_ready', 'order_completed'];
    if (!validEmailTypes.includes(requestData.emailType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email type' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role client for order lookup
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_name, customer_email, items, total, delivery_type, mpesa_code, user_id')
      .eq('id', requestData.orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is admin or order owner
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isAdmin = !!adminRole;
    const isOwner = order.user_id === user.id;

    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({ error: 'Access denied - you can only send emails for your own orders' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if order has an email address
    if (!order.customer_email) {
      return new Response(
        JSON.stringify({ error: 'Order has no customer email address' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate email content
    const emailContent = getEmailContent(order as OrderData, requestData.emailType);
    
    if (!emailContent) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate email content' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Chopa Beauty <onboarding@resend.dev>",
        to: [order.customer_email],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const emailResult = await emailResponse.json();

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify(emailResult), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-order-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
