import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartNotificationProps {
  show: boolean;
  onClose: () => void;
}

const CartNotification = ({ show, onClose }: CartNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsAnimatingOut(false);
      
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        setIsAnimatingOut(true);
        setTimeout(() => {
          setIsVisible(false);
          onClose();
        }, 300); // Wait for fade-out animation
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-300",
        isAnimatingOut ? "opacity-0 -translate-y-full" : "opacity-100 translate-y-0"
      )}
    >
      <div className="bg-[hsl(142,70%,35%)] text-white py-4 px-6 shadow-lg">
        <div className="container mx-auto flex items-center justify-center gap-3">
          <CheckCircle className="w-6 h-6" />
          <span className="text-lg font-semibold">✅ Item successfully added to cart!</span>
        </div>
      </div>
    </div>
  );
};

export default CartNotification;
