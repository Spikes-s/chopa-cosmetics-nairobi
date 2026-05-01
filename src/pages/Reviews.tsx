import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquareQuote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ReviewForm from '@/components/ReviewForm';
import ReviewCard from '@/components/reviews/ReviewCard';
import { fetchReviews, type ReviewRecord } from '@/lib/reviews';

interface ProductOption {
  id: string;
  name: string;
}

const Reviews = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState(searchParams.get('product') || 'all');

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase
        .from('public_products')
        .select('id, name')
        .order('name', { ascending: true });

      if (data) {
        setProducts(data.filter((product): product is ProductOption => Boolean(product.id && product.name)));
      }
    };

    loadProducts();
  }, []);

  const loadReviews = async (productId?: string) => {
    setLoading(true);
    try {
      const data = await fetchReviews(productId);
      setReviews(data);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const productId = selectedProductId === 'all' ? undefined : selectedProductId;
    loadReviews(productId);
  }, [selectedProductId]);

  const handleReviewSubmitted = (review: ReviewRecord) => {
    const matchesFilter = selectedProductId === 'all' || review.product_id === selectedProductId;
    if (matchesFilter) {
      setReviews((prev) => [review, ...prev]);
    }
  };

  const selectedProductName = useMemo(
    () => products.find((product) => product.id === selectedProductId)?.name,
    [products, selectedProductId],
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-display font-bold text-foreground md:text-4xl">Customer Reviews</h1>
        <p className="text-muted-foreground">
          Read real customer feedback and leave your own review.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Choose Product</label>
              <Select
                value={selectedProductId}
                onValueChange={(value) => {
                  setSelectedProductId(value);
                  if (value === 'all') {
                    setSearchParams({});
                  } else {
                    setSearchParams({ product: value });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ReviewForm
              productId={selectedProductId === 'all' ? '' : selectedProductId}
              onReviewSubmitted={() => {
                const productId = selectedProductId === 'all' ? undefined : selectedProductId;
                loadReviews(productId);
              }}
            />
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareQuote className="h-5 w-5 text-primary" />
              {selectedProductName ? `${selectedProductName} Reviews` : 'Latest Reviews'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            {loading ? (
              <div className="space-y-4">
                <div className="h-24 animate-pulse rounded-lg bg-muted" />
                <div className="h-24 animate-pulse rounded-lg bg-muted" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No reviews yet. Be the first to share your experience.
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} showProductName={selectedProductId === 'all'} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reviews;