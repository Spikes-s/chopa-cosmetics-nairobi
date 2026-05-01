import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ReviewForm from './ReviewForm';
import ReviewStatsCard from './reviews/ReviewStats';
import ReviewCard from './reviews/ReviewCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchReviews, type ReviewRecord, type ReviewStats, type ReviewSort } from '@/lib/reviews';

interface ProductReviewsProps {
  productId: string;
}

const PAGE_SIZE = 5;

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total: 0, average: 0, breakdown: {} });
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const result = await fetchReviews({ productId, sort, pageSize: 50 });
      setReviews(result.reviews);
      setStats(result.stats);
    } catch (e) {
      console.error('Failed to load reviews', e);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productId, sort]);

  useEffect(() => { load(); }, [load]);

  // Realtime updates so the section refreshes after new submissions
  useEffect(() => {
    if (!productId) return;
    const channel = supabase
      .channel(`reviews-${productId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_reviews',
        filter: `product_id=eq.${productId}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [productId, load]);

  const visible = reviews.slice(0, visibleCount);

  return (
    <Card variant="glass" className="mt-8">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Customer Reviews</CardTitle>
          <Select value={sort} onValueChange={(v) => { setSort(v as ReviewSort); setVisibleCount(PAGE_SIZE); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="highest">Highest rated</SelectItem>
              <SelectItem value="lowest">Lowest rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : (
          <>
            {stats.total > 0 ? (
              <ReviewStatsCard stats={stats} />
            ) : (
              <p className="text-center text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
            )}

            <Separator />

            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Write a Review</h4>
              <ReviewForm productId={productId} onReviewSubmitted={load} />
            </div>

            {visible.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  {visible.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
                {visibleCount < reviews.length && (
                  <Button variant="outline" className="w-full" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                    Show more reviews
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductReviews;
