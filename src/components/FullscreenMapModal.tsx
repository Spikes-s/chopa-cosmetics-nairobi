import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface FullscreenMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  branchName: string;
}

const FullscreenMapModal = ({ isOpen, onClose, latitude, longitude, branchName }: FullscreenMapModalProps) => {
  const { theme } = useTheme();
  const [zoom, setZoom] = useState(15);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const mapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&output=embed&z=${zoom}`;

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 2, 20));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 2, 5));
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-none rounded-none bg-background [&>button]:hidden">
        {/* Header bar */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur-sm border-b border-border">
          <h3 className="font-semibold text-foreground text-sm truncate">{branchName}</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Map - full viewport, touch-action enabled for gestures */}
        <div
          className={`w-full h-full pt-12 ${
            theme === 'dark' ? 'brightness-75 contrast-125 invert hue-rotate-180' : ''
          }`}
          style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
        >
          <iframe
            ref={iframeRef}
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Fullscreen map - ${branchName}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullscreenMapModal;
