import { Star } from 'lucide-react';
import ProductRating from '@/components/ProductRating';
import type { ReviewStats } from '@/lib/reviews';

interface ReviewStatsProps {
  stats: ReviewStats;
}

const ReviewStatsCard = ({ stats }: ReviewStatsProps) => {
  const { total, average, breakdown } = stats;

  return (
    <div className="rounded-lg bg-muted/30 p-4">
      <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
        <div className="text-center">
          <p className="text-4xl font-bold text-foreground">{average.toFixed(1)}</p>
          <ProductRating rating={Math.round(average)} size="md" showCount={false} />
          <p className="mt-1 text-xs text-muted-foreground">
            {total} {total === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = breakdown[star] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="flex w-10 items-center gap-1 text-muted-foreground">
                  {star} <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReviewStatsCard;
