import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ProductImageViewerProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productDescription?: string;
}

const ProductImageViewer = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  productName,
  productDescription,
}: ProductImageViewerProps) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex]);

  const goToPrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
    setTouchStart(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  // Preview mode (not fullscreen)
  if (!isFullscreen) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" onKeyDown={handleKeyDown}>
          <div className="flex flex-col md:flex-row">
            {/* Image on left */}
            <div 
              className="flex-1 relative bg-muted/30 min-h-[300px] md:min-h-[500px]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={images[activeIndex]}
                alt={productName}
                className="w-full h-full object-contain"
              />
              
              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="glass"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={goToPrevious}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="glass"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={goToNext}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </>
              )}

              {/* Image indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Description on right */}
            <div className="w-full md:w-72 p-6 border-l border-border flex flex-col">
              <h3 className="font-display font-bold text-lg text-foreground mb-2">
                {productName}
              </h3>
              {productDescription && (
                <p className="text-sm text-muted-foreground flex-1">
                  {productDescription}
                </p>
              )}
              
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsFullscreen(true)}
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Tap to view fullscreen
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Fullscreen mode
  return (
    <div 
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
        onClick={() => setIsFullscreen(false)}
      >
        <X className="w-6 h-6" />
      </Button>

      <img
        src={images[activeIndex]}
        alt={productName}
        className="max-w-full max-h-full object-contain"
      />

      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
            onClick={goToPrevious}
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
            onClick={goToNext}
          >
            <ChevronRight className="w-8 h-8" />
          </Button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === activeIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductImageViewer;
