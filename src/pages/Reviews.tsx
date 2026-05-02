import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquareQuote, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ReviewForm from '@/components/ReviewForm';
import ReviewCard from '@/components/reviews/ReviewCard';
import ReviewStatsCard from '@/components/reviews/ReviewStats';
import { fetchReviews, type ReviewRecord, type ReviewSort, type ReviewStats, type ReviewPagination } from '@/lib/reviews';

interface ProductOption { id: string; name: string }

const PAGE_SIZE = 8;

const Reviews = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total: 0, average: 0, breakdown: {} });
  const [pagination, setPagination] = useState<ReviewPagination>({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState(searchParams.get('product') || 'all');
  const [sort, setSort] = useState<ReviewSort>((searchParams.get('sort') as ReviewSort) || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page') || '1'));

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase.from('public_products').select('id, name').order('name');
      if (data) setProducts(data.filter((p): p is ProductOption => Boolean(p.id && p.name)));
    };
    loadProducts();
  }, []);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const productId = selectedProductId === 'all' ? undefined : selectedProductId;
      const result = await fetchReviews({ productId, sort, page, pageSize: PAGE_SIZE });
      setReviews(result.reviews);
      setStats(result.stats);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProductId, sort, page]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  // Realtime: auto-refresh when any review is added/updated/deleted
  useEffect(() => {
    const channel = supabase
      .channel('reviews-global')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_reviews',
      }, () => loadReviews())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadReviews]);

  // Sync URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedProductId !== 'all') params.product = selectedProductId;
    if (sort !== 'newest') params.sort = sort;
    if (page > 1) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [selectedProductId, sort, page, setSearchParams]);

  const selectedProductName = useMemo(
    () => products.find((p) => p.id === selectedProductId)?.name,
    [products, selectedProductId],
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-display font-bold text-foreground md:text-4xl">Customer Reviews</h1>
        <p className="text-muted-foreground">Read real customer feedback and leave your own review.</p>
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
                onValueChange={(value) => { setSelectedProductId(value); setPage(1); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ReviewForm
              productId={selectedProductId === 'all' ? '' : selectedProductId}
              onReviewSubmitted={() => { setPage(1); loadReviews(); }}
            />
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquareQuote className="h-5 w-5 text-primary" />
                {selectedProductName ? `${selectedProductName} Reviews` : 'Latest Reviews'}
              </CardTitle>
              <Select value={sort} onValueChange={(v) => { setSort(v as ReviewSort); setPage(1); }}>
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
            {stats.total > 0 && <ReviewStatsCard stats={stats} />}
            <Separator />

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : reviews.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No reviews yet. Be the first to share your experience.</p>
            ) : (
              <>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} showProductName={selectedProductId === 'all'} />
                  ))}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="gap-1">
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} className="gap-1">
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reviews;
