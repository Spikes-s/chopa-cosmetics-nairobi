import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation regex patterns
const KENYAN_PHONE_REGEX = /^(?:\+254|0)[17]\d{8}$/;
// M-Pesa validation: accept full message or just transaction code
const MPESA_CODE_REGEX = /[A-Z0-9]{10,15}/; // Extract code from message
const MPESA_MESSAGE_MIN_LENGTH = 10;

interface OrderItem {
  id: string;
  quantity: number;
  name?: string;
  price?: number;
  wholesalePrice?: number;
  color?: string;
  size?: string;
  image?: string;
}

interface OrderRequest {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  items: OrderItem[];
  mpesa_code: string;
  delivery_type: 'delivery' | 'pickup';
  delivery_address?: string;
  delivery_fee?: number;
  pickup_date?: string;
  pickup_time?: string;
  user_id?: string;
}

interface Product {
  id: string;
  name: string;
  retail_price: number;
  wholesale_price: number | null;
  wholesale_min_qty: number | null;
  category: string;
  image_url: string | null;
  in_stock: boolean | null;
  stock_quantity: number | null;
}

const validateRequest = (body: any): { valid: boolean; error?: string; data?: OrderRequest } => {
  // Validate customer_name
  if (!body.customer_name || typeof body.customer_name !== 'string') {
    return { valid: false, error: 'Customer name is required' };
  }
  const customerName = body.customer_name.trim();
  if (customerName.length < 2 || customerName.length > 100) {
    return { valid: false, error: 'Customer name must be between 2 and 100 characters' };
  }

  // Validate customer_phone (Kenyan format)
  if (!body.customer_phone || typeof body.customer_phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }
  const customerPhone = body.customer_phone.trim();
  if (!KENYAN_PHONE_REGEX.test(customerPhone)) {
    return { valid: false, error: 'Invalid phone number format. Use Kenyan format (e.g., 0712345678 or +254712345678)' };
  }

  // Validate customer_email (optional)
  let customerEmail: string | undefined;
  if (body.customer_email) {
    if (typeof body.customer_email !== 'string') {
      return { valid: false, error: 'Invalid email format' };
    }
    const trimmedEmail = body.customer_email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 255) {
      return { valid: false, error: 'Invalid email format' };
    }
    customerEmail = trimmedEmail;
  }

  // Validate mpesa_code - accept full message or just code
  if (!body.mpesa_code || typeof body.mpesa_code !== 'string') {
    return { valid: false, error: 'M-Pesa confirmation message is required' };
  }
  const mpesaInput = body.mpesa_code.trim();
  if (mpesaInput.length < MPESA_MESSAGE_MIN_LENGTH) {
    return { valid: false, error: 'Please paste the complete M-Pesa confirmation message' };
  }
  // Extract transaction code from message if present
  const codeMatch = mpesaInput.toUpperCase().match(MPESA_CODE_REGEX);
  const mpesaCode = codeMatch ? codeMatch[0] : mpesaInput.toUpperCase().slice(0, 15);

  // Validate items array
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return { valid: false, error: 'Order must contain at least one item' };
  }
  if (body.items.length > 50) {
    return { valid: false, error: 'Order cannot contain more than 50 different items' };
  }

  const validatedItems: OrderItem[] = [];
  for (const item of body.items) {
    if (!item.id || typeof item.id !== 'string') {
      return { valid: false, error: 'Each item must have a valid ID' };
    }
    if (item.id.length < 1 || item.id.length > 100) {
      return { valid: false, error: 'Invalid item ID format' };
    }
    if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
      return { valid: false, error: 'Item quantity must be between 1 and 999' };
    }
    validatedItems.push({ 
      id: item.id, 
      quantity: item.quantity,
      name: item.name,
      price: item.price,
      wholesalePrice: item.wholesalePrice,
      color: item.color,
      size: item.size,
      image: item.image,
    });
  }

  // Validate delivery_type
  if (body.delivery_type !== 'delivery' && body.delivery_type !== 'pickup') {
    return { valid: false, error: 'Delivery type must be "delivery" or "pickup"' };
  }

  // Validate delivery_address for delivery orders
  let deliveryAddress: string | undefined;
  if (body.delivery_type === 'delivery') {
    if (!body.delivery_address || typeof body.delivery_address !== 'string') {
      return { valid: false, error: 'Delivery address is required for delivery orders' };
    }
    const trimmedAddress = body.delivery_address.trim();
    if (trimmedAddress.length < 5 || trimmedAddress.length > 500) {
      return { valid: false, error: 'Delivery address must be between 5 and 500 characters' };
    }
    deliveryAddress = trimmedAddress;
  }

  // Validate delivery_fee
  let deliveryFee = 0;
  if (body.delivery_fee !== undefined) {
    if (typeof body.delivery_fee !== 'number' || body.delivery_fee < 0 || body.delivery_fee > 5000) {
      return { valid: false, error: 'Invalid delivery fee' };
    }
    deliveryFee = body.delivery_fee;
  }

  // Validate pickup details
  let pickupDate: string | undefined;
  let pickupTime: string | undefined;
  if (body.delivery_type === 'pickup') {
    if (body.pickup_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.pickup_date)) {
        return { valid: false, error: 'Invalid pickup date format' };
      }
      pickupDate = body.pickup_date;
    }
    if (body.pickup_time) {
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(body.pickup_time)) {
        return { valid: false, error: 'Invalid pickup time format' };
      }
      pickupTime = body.pickup_time;
    }
  }

  return {
    valid: true,
    data: {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      items: validatedItems,
      mpesa_code: mpesaCode,
      delivery_type: body.delivery_type,
      delivery_address: deliveryAddress,
      delivery_fee: deliveryFee,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      user_id: body.user_id,
    },
  };
};

const handler = async (req: Request): Promise<Response> => {
  console.log('validate-order function called');
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- AUTH: Verify caller identity ---
    const authHeader = req.headers.get('Authorization');
    let verifiedUserId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
      if (!claimsError && claimsData?.claims?.sub) {
        verifiedUserId = claimsData.claims.sub as string;
      }
    }

    // Enforce request body size limit (100KB max)
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    if (contentLength > 102400) {
      return new Response(
        JSON.stringify({ success: false, error: 'Request too large' }),
        { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = validateRequest(body);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const orderData = validation.data!;

    // --- AUTH: Determine the user_id to use ---
    // If authenticated, always use the verified user ID (ignore client-supplied value)
    // If not authenticated, force null (guest order)
    const resolvedUserId = verifiedUserId || null;

    // Rate limiting check - max 5 orders per hour per phone
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: recentOrders, error: rateLimitError } = await supabase
      .from('orders')
      .select('created_at')
      .eq('customer_phone', orderData.customer_phone)
      .gte('created_at', oneHourAgo);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    } else if (recentOrders && recentOrders.length >= 5) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 5 orders per hour.' }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Try to fetch product prices from database
    const productIds = orderData.items.map(item => item.id);
    const { data: dbProducts, error: productsError } = await supabase
      .from('products')
      .select('id, name, retail_price, wholesale_price, wholesale_min_qty, category, image_url, in_stock, stock_quantity')
      .in('id', productIds);

    if (productsError) {
      console.error('Products fetch error:', productsError);
    }

    // Create a map of database products for quick lookup
    const dbProductMap = new Map<string, Product>();
    if (dbProducts) {
      dbProducts.forEach((p: Product) => dbProductMap.set(p.id, p));
    }

    console.log(`Found ${dbProductMap.size} products in database out of ${productIds.length} requested`);

    // Reject any items not found in the database — never trust client prices
    const missingItems = orderData.items.filter(item => !dbProductMap.has(item.id));
    if (missingItems.length > 0) {
      const missingNames = missingItems.map(i => i.name || i.id).join(', ');
      console.error('Items not found in database:', missingNames);
      return new Response(
        JSON.stringify({ error: 'Some items are no longer available. Please refresh and try again.' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Calculate prices using only server-side database values
    let subtotal = 0;
    
    const orderItems = orderData.items.map(item => {
      const dbProduct = dbProductMap.get(item.id)!;
      
      if (dbProduct.in_stock === false) {
        throw new Error('Some items in your order are currently unavailable');
      }
      if (dbProduct.stock_quantity !== null && dbProduct.stock_quantity < item.quantity) {
        throw new Error('Some items have insufficient stock. Please adjust quantities');
      }

      const isBraid = dbProduct.category.toLowerCase().includes('braid');
      const threshold = dbProduct.wholesale_min_qty || (isBraid ? 10 : 6);
      const isWholesale = item.quantity >= threshold && dbProduct.wholesale_price !== null && dbProduct.wholesale_price > 0;
      const unitPrice = isWholesale ? dbProduct.wholesale_price! : dbProduct.retail_price;
      const itemTotal = unitPrice * item.quantity;
      
      subtotal += itemTotal;

      return {
        id: dbProduct.id,
        name: dbProduct.name,
        quantity: item.quantity,
        price: unitPrice,
        priceType: isWholesale ? 'wholesale' : 'retail',
        image: dbProduct.image_url,
        color: item.color,
        size: item.size,
      };
    });

    const deliveryFee = orderData.delivery_fee || 0;
    const total = subtotal + deliveryFee;

    // Generate order token for guest order tracking
    const orderToken = crypto.randomUUID();
    const orderTokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    // Insert order with SERVER-CALCULATED values and VERIFIED user_id
    const { data: createdOrder, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id: resolvedUserId,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_email: orderData.customer_email || null,
        items: orderItems,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total: total,
        delivery_type: orderData.delivery_type,
        delivery_address: orderData.delivery_address || null,
        pickup_date: orderData.pickup_date || null,
        pickup_time: orderData.pickup_time || null,
        payment_status: 'pending',
        order_status: 'pending',
        mpesa_code: orderData.mpesa_code,
        order_token: orderToken,
        order_token_expires_at: orderTokenExpiresAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Order insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Order created successfully:', createdOrder.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: {
          id: createdOrder.id,
          order_status: createdOrder.order_status,
          receipt_number: createdOrder.receipt_number,
          created_at: createdOrder.created_at,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in validate-order function:', error.message);
    
    let userMessage = 'An error occurred processing your order. Please try again';
    const errorMsg = (error.message || '').toLowerCase();
    
    if (errorMsg.includes('unavailable') || errorMsg.includes('out of stock')) {
      userMessage = 'Some items in your order are currently unavailable';
    } else if (errorMsg.includes('insufficient stock') || errorMsg.includes('quantities')) {
      userMessage = 'Some items have insufficient stock. Please adjust quantities';
    } else if (errorMsg.includes('invalid order data') || errorMsg.includes('refresh')) {
      userMessage = 'Invalid order data. Please refresh and try again';
    }
    
    return new Response(
      JSON.stringify({ success: false, error: userMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
