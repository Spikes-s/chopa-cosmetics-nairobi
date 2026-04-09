import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ReviewSchema = z.object({
  productId: z.string().uuid('Invalid product id'),
  customerName: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be under 80 characters'),
  rating: z.number().int().min(1, 'Rating is required').max(5, 'Rating must be between 1 and 5'),
  reviewText: z.string().trim().min(3, 'Comment must be at least 3 characters').max(1000, 'Comment must be under 1000 characters'),
  reviewImages: z.array(z.string().url('Invalid review image URL')).max(3).optional().default([]),
});

const createJsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('reviews: missing environment variables');
    return createJsonResponse({ success: false, message: 'Server configuration error' }, 500);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const productId = url.searchParams.get('productId');

      let query = adminClient
        .from('product_reviews')
        .select('id, product_id, customer_name, rating, review_text, review_images, created_at, products(name)')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('reviews GET error:', error);
        return createJsonResponse({ success: false, message: 'Failed to load reviews' }, 500);
      }

      const reviews = (data || []).map((review) => ({
        id: review.id,
        product_id: review.product_id,
        customer_name: review.customer_name,
        rating: review.rating,
        review_text: review.review_text,
        review_images: review.review_images,
        created_at: review.created_at,
        product_name: Array.isArray(review.products)
          ? review.products[0]?.name ?? null
          : (review.products as { name?: string } | null)?.name ?? null,
      }));

      return createJsonResponse({ success: true, message: 'Reviews loaded successfully', reviews });
    }

    if (req.method !== 'POST') {
      return createJsonResponse({ success: false, message: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createJsonResponse({ success: false, message: 'Authentication required' }, 401);
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error('reviews auth error:', userError);
      return createJsonResponse({ success: false, message: 'Invalid authentication' }, 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      console.error('reviews parse error:', error);
      return createJsonResponse({ success: false, message: 'Invalid JSON body' }, 400);
    }

    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) {
      return createJsonResponse(
        {
          success: false,
          message: Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Invalid review data',
        },
        400,
      );
    }

    const { productId, customerName, rating, reviewText, reviewImages } = parsed.data;

    const { data: product, error: productError } = await adminClient
      .from('public_products')
      .select('id, name')
      .eq('id', productId)
      .maybeSingle();

    if (productError || !product) {
      console.error('reviews product lookup error:', productError);
      return createJsonResponse({ success: false, message: 'Product not found' }, 404);
    }

    const { data: review, error: insertError } = await adminClient
      .from('product_reviews')
      .insert({
        product_id: productId,
        user_id: user.id,
        customer_name: customerName,
        rating,
        review_text: reviewText,
        review_images: reviewImages,
        is_approved: true,
      })
      .select('id, product_id, customer_name, rating, review_text, review_images, created_at')
      .single();

    if (insertError || !review) {
      console.error('reviews insert error:', insertError);
      return createJsonResponse({ success: false, message: 'Failed to submit review' }, 500);
    }

    return createJsonResponse({
      success: true,
      message: 'Review submitted successfully',
      review: {
        ...review,
        product_name: product.name,
      },
    });
  } catch (error) {
    console.error('reviews unexpected error:', error);
    return createJsonResponse({ success: false, message: 'Something went wrong while submitting the review' }, 500);
  }
});