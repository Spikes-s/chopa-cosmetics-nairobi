import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Trash2, Check, X, RefreshCw } from 'lucide-react';
import ProductRating from '@/components/ProductRating';
import { SafeImage } from '@/components/ui/safe-image';
import { fetchReviews, moderateReview, deleteReview, type ReviewRecord } from '@/lib/reviews';
import { formatDistanceToNow } from 'date-fns';

const PAGE_SIZE = 20;

const ReviewsManager = () => {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { reviews } = await fetchReviews({ admin: true, pageSize: PAGE_SIZE, sort: 'newest' });
      setReviews(reviews);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleModerate = async (id: string, approve: boolean) => {
    setActionId(id);
    try {
      await moderateReview(id, approve);
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_approved: approve } : r)));
      toast.success(approve ? 'Review approved' : 'Review hidden');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update review');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this review?')) return;
    setActionId(id);
    try {
      await deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success('Review deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete review');
    } finally {
      setActionId(null);
    }
  };

  const filtered = reviews.filter((r) => {
    if (filter === 'approved') return r.is_approved;
    if (filter === 'pending') return !r.is_approved;
    return true;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Customer Reviews</CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({reviews.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({reviews.filter((r) => r.is_approved).length})</TabsTrigger>
            <TabsTrigger value="pending">Hidden ({reviews.filter((r) => !r.is_approved).length})</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No reviews to show.</p>
            ) : (
              filtered.map((review) => (
                <div key={review.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{review.customer_name || 'Anonymous'}</p>
                        <ProductRating rating={review.rating} size="sm" showCount={false} />
                        <span className={`text-xs px-2 py-0.5 rounded-full ${review.is_approved ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                          {review.is_approved ? 'Approved' : 'Hidden'}
                        </span>
                      </div>
                      {review.product_name && (
                        <p className="text-xs text-primary mt-0.5">{review.product_name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                      </p>
                      {review.review_text && (
                        <p className="text-sm text-muted-foreground mt-2">{review.review_text}</p>
                      )}
                      {review.review_images && review.review_images.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {review.review_images.map((img, i) => (
                            <SafeImage
                              key={`${review.id}-${i}`}
                              src={img}
                              alt={`Review ${i + 1}`}
                              className="object-cover"
                              containerClassName="h-16 w-16 rounded-lg border border-border"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 md:flex-col">
                      {review.is_approved ? (
                        <Button variant="outline" size="sm" onClick={() => handleModerate(review.id, false)} disabled={actionId === review.id} className="gap-1">
                          <X className="w-4 h-4" /> Hide
                        </Button>
                      ) : (
                        <Button variant="default" size="sm" onClick={() => handleModerate(review.id, true)} disabled={actionId === review.id} className="gap-1">
                          <Check className="w-4 h-4" /> Approve
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(review.id)} disabled={actionId === review.id} className="gap-1">
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ReviewsManager;
