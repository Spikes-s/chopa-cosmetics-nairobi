import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

const ReviewSchema = z.object({
  productId: z.string().uuid('Invalid product id'),
  customerName: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be under 80 characters'),
  rating: z.number().int().min(1, 'Rating is required').max(5, 'Rating must be between 1 and 5'),
  reviewText: z.string().trim().min(3, 'Comment must be at least 3 characters').max(1000, 'Comment must be under 1000 characters'),
  reviewImages: z.array(z.string().url('Invalid review image URL')).max(3).optional().default([]),
});

const ModerationSchema = z.object({
  reviewId: z.string().uuid(),
  isApproved: z.boolean(),
});

const SORT_OPTIONS: Record<string, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  oldest: { column: 'created_at', ascending: true },
  highest: { column: 'rating', ascending: false },
  lowest: { column: 'rating', ascending: true },
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('reviews: missing env');
    return json({ success: false, message: 'Server configuration error' }, 500);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Helper: resolve user from Bearer token
  const getAuthUser = async () => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return { user: null, isAdmin: false };

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return { user: null, isAdmin: false };

    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    return { user, isAdmin: Boolean(roleData) };
  };

  try {
    const url = new URL(req.url);

    // GET — list reviews with sort, pagination, optional admin (include unapproved)
    if (req.method === 'GET') {
      const productId = url.searchParams.get('productId');
      const sortKey = url.searchParams.get('sort') || 'newest';
      const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
      const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || '10')));
      const adminView = url.searchParams.get('admin') === 'true';

      const sort = SORT_OPTIONS[sortKey] || SORT_OPTIONS.newest;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let isAdmin = false;
      if (adminView) {
        const auth = await getAuthUser();
        if (!auth.isAdmin) return json({ success: false, message: 'Admin access required' }, 403);
        isAdmin = true;
      }

      let query = adminClient
        .from('product_reviews')
        .select('id, product_id, customer_name, rating, review_text, review_images, created_at, is_approved, products(name)', { count: 'exact' })
        .order(sort.column, { ascending: sort.ascending })
        .range(from, to);

      if (!isAdmin) query = query.eq('is_approved', true);
      if (productId) query = query.eq('product_id', productId);

      const { data, error, count } = await query;
      if (error) {
        console.error('reviews GET error:', error);
        return json({ success: false, message: 'Failed to load reviews' }, 500);
      }

      const reviews = (data || []).map((r: any) => ({
        id: r.id,
        product_id: r.product_id,
        customer_name: r.customer_name,
        rating: r.rating,
        review_text: r.review_text,
        review_images: r.review_images,
        created_at: r.created_at,
        is_approved: r.is_approved,
        product_name: Array.isArray(r.products) ? r.products[0]?.name ?? null : r.products?.name ?? null,
      }));

      // Stats for the same filter (always against approved unless admin)
      let statsQuery = adminClient.from('product_reviews').select('rating');
      if (!isAdmin) statsQuery = statsQuery.eq('is_approved', true);
      if (productId) statsQuery = statsQuery.eq('product_id', productId);
      const { data: statsData } = await statsQuery;

      const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
      let total = 0;
      let sum = 0;
      (statsData || []).forEach((r: any) => {
        const rating = Math.max(1, Math.min(5, Number(r.rating)));
        breakdown[rating] = (breakdown[rating] || 0) + 1;
        total += 1;
        sum += rating;
      });

      return json({
        success: true,
        message: 'Reviews loaded',
        reviews,
        pagination: { page, pageSize, total: count ?? total, totalPages: Math.max(1, Math.ceil((count ?? total) / pageSize)) },
        stats: { total, average: total > 0 ? Math.round((sum / total) * 10) / 10 : 0, breakdown },
      });
    }

    // POST — create review (auth required)
    if (req.method === 'POST') {
      const { user } = await getAuthUser();
      if (!user) return json({ success: false, message: 'Authentication required' }, 401);

      let body: unknown;
      try { body = await req.json(); }
      catch { return json({ success: false, message: 'Invalid JSON body' }, 400); }

      const parsed = ReviewSchema.safeParse(body);
      if (!parsed.success) {
        return json(
          { success: false, message: Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Invalid review data' },
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
        return json({ success: false, message: 'Product not found' }, 404);
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
        .select('id, product_id, customer_name, rating, review_text, review_images, created_at, is_approved')
        .single();

      if (insertError || !review) {
        console.error('reviews insert error:', insertError);
        return json({ success: false, message: 'Failed to submit review' }, 500);
      }

      return json({
        success: true,
        message: 'Review submitted successfully',
        review: { ...review, product_name: product.name },
      });
    }

    // PATCH — admin moderation (approve/reject)
    if (req.method === 'PATCH') {
      const auth = await getAuthUser();
      if (!auth.isAdmin) return json({ success: false, message: 'Admin access required' }, 403);

      let body: unknown;
      try { body = await req.json(); }
      catch { return json({ success: false, message: 'Invalid JSON body' }, 400); }

      const parsed = ModerationSchema.safeParse(body);
      if (!parsed.success) return json({ success: false, message: 'Invalid moderation data' }, 400);

      const { error } = await adminClient
        .from('product_reviews')
        .update({ is_approved: parsed.data.isApproved })
        .eq('id', parsed.data.reviewId);

      if (error) {
        console.error('reviews moderation error:', error);
        return json({ success: false, message: 'Failed to update review' }, 500);
      }

      return json({ success: true, message: parsed.data.isApproved ? 'Review approved' : 'Review hidden' });
    }

    // DELETE — admin removes review
    if (req.method === 'DELETE') {
      const auth = await getAuthUser();
      if (!auth.isAdmin) return json({ success: false, message: 'Admin access required' }, 403);

      const reviewId = url.searchParams.get('reviewId');
      if (!reviewId) return json({ success: false, message: 'reviewId required' }, 400);

      const { error } = await adminClient.from('product_reviews').delete().eq('id', reviewId);
      if (error) {
        console.error('reviews delete error:', error);
        return json({ success: false, message: 'Failed to delete review' }, 500);
      }
      return json({ success: true, message: 'Review deleted' });
    }

    return json({ success: false, message: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('reviews unexpected error:', error);
    return json({ success: false, message: 'Something went wrong' }, 500);
  }
});
