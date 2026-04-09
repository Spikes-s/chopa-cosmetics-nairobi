import { supabase } from '@/integrations/supabase/client';

export interface ReviewRecord {
  id: string;
  product_id: string;
  customer_name: string | null;
  rating: number;
  review_text: string | null;
  review_images: string[] | null;
  created_at: string;
  product_name?: string | null;
}

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

const REVIEWS_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reviews`;

const parseResponse = async (response: Response) => {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || 'Request failed');
  }

  return payload;
};

export const validateReviewInput = ({
  productId,
  customerName,
  rating,
  reviewText,
}: ReviewFormValues): ReviewValidationErrors => {
  const errors: ReviewValidationErrors = {};

  if (!productId) {
    errors.productId = 'Please choose a product';
  }

  if (!customerName.trim()) {
    errors.customerName = 'Name is required';
  } else if (customerName.trim().length < 2) {
    errors.customerName = 'Name must be at least 2 characters';
  } else if (customerName.trim().length > 80) {
    errors.customerName = 'Name must be under 80 characters';
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = 'Please choose a rating';
  }

  if (!reviewText.trim()) {
    errors.reviewText = 'Comment is required';
  } else if (reviewText.trim().length < 3) {
    errors.reviewText = 'Comment must be at least 3 characters';
  } else if (reviewText.trim().length > 1000) {
    errors.reviewText = 'Comment must be under 1000 characters';
  }

  return errors;
};

export const fetchReviews = async (productId?: string) => {
  const url = new URL(REVIEWS_ENDPOINT);
  if (productId) url.searchParams.set('productId', productId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  const payload = await parseResponse(response);
  return payload.reviews as ReviewRecord[];
};

export const submitReview = async (values: ReviewFormValues, timeoutMs = 10000) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('Please sign in to leave a review');
  }

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