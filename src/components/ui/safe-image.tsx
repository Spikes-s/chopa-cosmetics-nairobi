import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FALLBACK_IMAGE_URL, resolveImageUrl } from '@/lib/images';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  fallbackSrc?: string;
}

const SafeImage = React.forwardRef<HTMLImageElement, SafeImageProps>(
  ({
    src,
    alt,
    className,
    containerClassName,
    fallbackSrc = FALLBACK_IMAGE_URL,
    onLoad,
    onError,
    ...props
  }, ref) => {
    const initialSrc = resolveImageUrl(typeof src === 'string' ? src : undefined, [fallbackSrc]);
    const [currentSrc, setCurrentSrc] = React.useState(initialSrc);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      setCurrentSrc(resolveImageUrl(typeof src === 'string' ? src : undefined, [fallbackSrc]));
      setLoading(true);
    }, [fallbackSrc, src]);

    return (
      <div className={cn('relative overflow-hidden bg-muted/30', containerClassName)}>
        {loading && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
        <img
          ref={ref}
          src={currentSrc}
          alt={alt}
          className={cn('h-full w-full transition-opacity duration-300', loading ? 'opacity-0' : 'opacity-100', className)}
          onLoad={(event) => {
            setLoading(false);
            onLoad?.(event);
          }}
          onError={(event) => {
            if (currentSrc !== fallbackSrc) {
              setCurrentSrc(fallbackSrc);
              return;
            }

            setLoading(false);
            onError?.(event);
          }}
          {...props}
        />
      </div>
    );
  },
);

SafeImage.displayName = 'SafeImage';

export { SafeImage };