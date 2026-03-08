import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductImageViewer from './ProductImageViewer';

interface ProductGalleryProps {
  mainImage: string;
  additionalImages?: string[];
  productName: string;
  productDescription?: string;
}

const ProductGallery = ({ mainImage, additionalImages, productName, productDescription }: ProductGalleryProps) => {
  const allImages = [mainImage, ...(additionalImages || [])].filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + allImages.length) % allImages.length);
  }, [allImages.length]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goTo(activeIndex + (diff > 0 ? 1 : -1));
    setTouchStart(null);
  };

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div
        className="relative aspect-square rounded-2xl overflow-hidden bg-muted/30 gradient-border cursor-zoom-in group"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setViewerOpen(true)}
      >
        <img
          src={allImages[activeIndex] || '/placeholder.svg'}
          alt={productName}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Zoom hint */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-background/80 backdrop-blur-sm rounded-full p-2">
            <ZoomIn className="w-4 h-4 text-foreground" />
          </div>
        </div>

        {/* Navigation arrows */}
        {allImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-sm hover:bg-background/80 h-8 w-8"
              onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1); }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-sm hover:bg-background/80 h-8 w-8"
              onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1); }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Dots */}
        {allImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                className={`w-2 h-2 rounded-full transition-all ${i === activeIndex ? 'bg-primary w-4' : 'bg-foreground/30'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === activeIndex ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
              }`}
            >
              <img src={img} alt={`${productName} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Viewer */}
      <ProductImageViewer
        images={allImages}
        currentIndex={activeIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        productName={productName}
        productDescription={productDescription}
      />
    </div>
  );
};

export default ProductGallery;
