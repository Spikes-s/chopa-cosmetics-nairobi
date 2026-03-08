import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';

const Terms = () => {
  const [content, setContent] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
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

    fetchTerms();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
      <div className="glass-card rounded-xl p-6 md:p-8">
        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl md:text-3xl font-display font-bold gradient-text mb-6">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground mt-8 mb-4 border-b border-border pb-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg md:text-xl font-semibold text-foreground mt-6 mb-3">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  {children}
                </ul>
              ),
              li: ({ children }) => (
                <li className="text-muted-foreground">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="text-foreground font-semibold">{children}</strong>
              ),
              hr: () => <hr className="border-border my-6" />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        
        <div className="mt-8 pt-4 border-t border-border space-y-2">
          {version && (
            <p className="text-xs text-muted-foreground text-center">
              Terms Version: {version}
            </p>
          )}
          <p className="text-sm text-muted-foreground text-center">
            Please also review our{' '}
            <a href="/privacy" className="text-primary underline hover:text-primary/80 transition-colors">
              Privacy Policy
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;