import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface TermsAcceptanceModalProps {
  open: boolean;
  onAccepted: () => void;
}

const TermsAcceptanceModal = ({ open, onAccepted }: TermsAcceptanceModalProps) => {
  const [content, setContent] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasRead, setHasRead] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTerms();
    }
  }, [open]);

  const fetchTerms = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('site_terms')
      .select('content, version')
      .eq('is_active', true)
      .single();

    if (data && !error) {
      setContent(data.content);
      setVersion(data.version);
    }
    setIsLoading(false);
  };

  const handleAccept = async () => {
    if (!user || !hasAgreed) return;

    setIsAccepting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: version,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Terms Accepted',
        description: 'Thank you for accepting our Terms & Conditions.',
      });
      
      onAccepted();
    } catch (err) {
      console.error('Error accepting terms:', err);
      toast({
        title: 'Error',
        description: 'Failed to save your acceptance. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-display gradient-text">
            Terms & Conditions
          </DialogTitle>
          <DialogDescription>
            Please read and accept our Terms & Conditions to continue using Chopa Cosmetics.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[50vh] pr-4">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-40 mt-6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none p-1">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-lg font-display font-bold text-foreground mb-4">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-display font-semibold text-foreground mt-6 mb-2 border-b border-border pb-1">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-muted-foreground">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-muted-foreground">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-foreground font-medium">{children}</strong>
                  ),
                  hr: () => <hr className="border-border my-4" />,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="read"
              checked={hasRead}
              onCheckedChange={(checked) => setHasRead(checked as boolean)}
            />
            <label
              htmlFor="read"
              className="text-sm text-muted-foreground leading-tight cursor-pointer"
            >
              I have read and understood the Terms & Conditions
            </label>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox
              id="agree"
              checked={hasAgreed}
              onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
              disabled={!hasRead}
            />
            <label
              htmlFor="agree"
              className={`text-sm leading-tight cursor-pointer ${
                hasRead ? 'text-muted-foreground' : 'text-muted-foreground/50'
              }`}
            >
              I agree to be bound by these Terms & Conditions
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!hasAgreed || isAccepting || isLoading}
            className="w-full sm:w-auto"
          >
            {isAccepting ? 'Accepting...' : 'Accept & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAcceptanceModal;