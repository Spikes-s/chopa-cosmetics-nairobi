import { User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ProductRating from '@/components/ProductRating';
import { SafeImage } from '@/components/ui/safe-image';
import type { ReviewRecord } from '@/lib/reviews';

interface ReviewCardProps {
  review: ReviewRecord;
  showProductName?: boolean;
}

const ReviewCard = ({ review, showProductName = false }: ReviewCardProps) => {
  return (
    <div className="rounded-lg bg-muted/20 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{review.customer_name || 'Anonymous'}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
            </p>
            {showProductName && review.product_name && (
              <p className="text-xs text-primary">{review.product_name}</p>
            )}
          </div>
        </div>
        <ProductRating rating={review.rating} size="sm" showCount={false} />
      </div>

      {review.review_text && <p className="mt-2 text-sm text-muted-foreground">{review.review_text}</p>}

      {review.review_images && review.review_images.length > 0 && (
        <div className="mt-3 flex gap-2">
          {review.review_images.map((img, index) => (
            <a
              key={`${review.id}-${index}`}
              href={img}
              target="_blank"
              rel="noopener noreferrer"
              className="h-16 w-16 overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-80"
            >
              <SafeImage
                src={img}
                alt={`Review photo ${index + 1}`}
                className="object-cover"
                containerClassName="h-full w-full"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewCard;