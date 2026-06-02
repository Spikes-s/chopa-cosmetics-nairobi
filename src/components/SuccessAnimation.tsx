import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessAnimationProps {
  message?: string;
  show: boolean;
  onDone?: () => void;
  duration?: number;
  className?: string;
}

/**
 * Reusable success confirmation overlay with animated checkmark.
 * Auto-dismisses after `duration` ms (default 1800).
 */
const SuccessAnimation = ({
  message = 'Success',
  show,
  onDone,
  duration = 1800,
  className,
}: SuccessAnimationProps) => {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [show, duration, onDone]);

  if (!show) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[120] flex items-center justify-center bg-background/60 backdrop-blur-sm animate-fade-in',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-card/90 border border-border px-8 py-6 shadow-2xl animate-scale-in">
        <div
          className="relative flex items-center justify-center w-20 h-20 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(340 90% 92%), hsl(330 70% 80%))',
            boxShadow: '0 0 30px hsl(330 80% 70% / 0.6)',
          }}
        >
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'hsl(330 70% 80% / 0.5)' }}
          />
          <Check className="w-10 h-10 text-white relative z-10" strokeWidth={3} />
        </div>
        <p className="font-display text-lg text-foreground text-center">{message}</p>
      </div>
    </div>
  );
};

export default SuccessAnimation;
