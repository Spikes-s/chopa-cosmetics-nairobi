import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type OverlayStatus = 'processing' | 'success' | 'error';

interface ProcessingOverlayProps {
  isOpen: boolean;
  status: OverlayStatus;
  title: string;
  message: string;
  onClose?: () => void;
  onRetry?: () => void;
}

const ProcessingOverlay = ({ isOpen, status, title, message, onClose, onRetry }: ProcessingOverlayProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-scale-in">
        {status === 'processing' && (
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
        {status === 'success' && (
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center animate-bounce-in">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
        )}
        {status === 'error' && (
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
        )}

        <h3 className="text-lg font-display font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>

        {status === 'success' && onClose && (
          <Button variant="gradient" className="w-full" onClick={onClose}>
            Continue
          </Button>
        )}
        {status === 'error' && (
          <div className="flex gap-3">
            {onRetry && (
              <Button variant="outline" className="flex-1" onClick={onRetry}>
                Try Again
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingOverlay;
