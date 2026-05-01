import { supabase } from '@/integrations/supabase/client';

export interface ReviewRecord {
  id: string;
  product_id: string;
  customer_name: string | null;
  rating: number;
  review_text: string | null;
  review_images: string[] | null;
  created_at: string;
  is_approved?: boolean;
  product_name?: string | null;
}

export interface ReviewStats {
  total: number;
  average: number;
  breakdown: Record<number, number>;
}

export interface ReviewPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ReviewListResponse {
  reviews: ReviewRecord[];
  stats: ReviewStats;
  pagination: ReviewPagination;
}

export type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface ReviewFormValues {
  productId: string;
  customerName: string;
  rating: number;
  reviewText: string;
  reviewImages?: string[];
}

export interface ReviewValidationErrors {
  productId?: string;
  customerName?: string;
  rating?: string;
  reviewText?: string;
}

export interface FetchReviewsOptions {
  productId?: string;
  sort?: ReviewSort;
  page?: number;
  pageSize?: number;
  admin?: boolean;
}

const REVIEWS_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reviews`;

const parseResponse = async (response: Response) => {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || 'Request failed');
  }
  return payload;
};

const getAccessToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
};

export const validateReviewInput = ({
  productId,
  customerName,
  rating,
  reviewText,
}: ReviewFormValues): ReviewValidationErrors => {
  const errors: ReviewValidationErrors = {};
  if (!productId) errors.productId = 'Please choose a product';
  const name = customerName.trim();
  if (!name) errors.customerName = 'Name is required';
  else if (name.length < 2) errors.customerName = 'Name must be at least 2 characters';
  else if (name.length > 80) errors.customerName = 'Name must be under 80 characters';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = 'Please choose a rating';
  const text = reviewText.trim();
  if (!text) errors.reviewText = 'Comment is required';
  else if (text.length < 3) errors.reviewText = 'Comment must be at least 3 characters';
  else if (text.length > 1000) errors.reviewText = 'Comment must be under 1000 characters';
  return errors;
};

export const fetchReviews = async (options: FetchReviewsOptions = {}): Promise<ReviewListResponse> => {
  const url = new URL(REVIEWS_ENDPOINT);
  if (options.productId) url.searchParams.set('productId', options.productId);
  if (options.sort) url.searchParams.set('sort', options.sort);
  if (options.page) url.searchParams.set('page', String(options.page));
  if (options.pageSize) url.searchParams.set('pageSize', String(options.pageSize));
  if (options.admin) url.searchParams.set('admin', 'true');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  if (options.admin) {
    const token = await getAccessToken();
    if (!token) throw new Error('Admin session required');
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), { method: 'GET', headers });
  const payload = await parseResponse(response);
  return {
    reviews: payload.reviews as ReviewRecord[],
    stats: payload.stats as ReviewStats,
    pagination: payload.pagination as ReviewPagination,
  };
};

export const submitReview = async (values: ReviewFormValues, timeoutMs = 10000) => {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Please sign in to leave a review');

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(REVIEWS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        productId: values.productId,
        customerName: values.customerName.trim(),
        rating: values.rating,
        reviewText: values.reviewText.trim(),
        reviewImages: values.reviewImages || [],
      }),
      signal: controller.signal,
    });

    const payload = await parseResponse(response);
    return payload.review as ReviewRecord;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
};

export const moderateReview = async (reviewId: string, isApproved: boolean) => {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Admin session required');

  const response = await fetch(REVIEWS_ENDPOINT, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ reviewId, isApproved }),
  });
  await parseResponse(response);
};

export const deleteReview = async (reviewId: string) => {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Admin session required');

  const url = new URL(REVIEWS_ENDPOINT);
  url.searchParams.set('reviewId', reviewId);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  await parseResponse(response);
};
