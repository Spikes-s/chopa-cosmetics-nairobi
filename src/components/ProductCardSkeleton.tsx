import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ProductCardSkeleton = () => {
  return (
    <Card variant="gradient" className="overflow-hidden">
      <div className="aspect-[4/5] bg-muted/30">
        <Skeleton className="w-full h-full rounded-none" />
      </div>
      <CardContent className="p-3 sm:p-4 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-baseline gap-2 pt-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-14" />
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCardSkeleton;
