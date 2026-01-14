import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface TermsStatus {
  needsAcceptance: boolean;
  isLoading: boolean;
  markAsAccepted: () => void;
}

export const useTermsAcceptance = (): TermsStatus => {
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setNeedsAcceptance(false);
      setIsLoading(false);
      return;
    }

    checkTermsAcceptance();
  }, [user, authLoading]);

  const checkTermsAcceptance = async () => {
    if (!user) return;

    try {
      // Get current active terms version
      const { data: terms } = await supabase
        .from('site_terms')
        .select('version')
        .eq('is_active', true)
        .single();

      if (!terms) {
        setNeedsAcceptance(false);
        setIsLoading(false);
        return;
      }

      // Get user's accepted terms version
      const { data: profile } = await supabase
        .from('profiles')
        .select('terms_accepted_at, terms_version')
        .eq('user_id', user.id)
        .single();

      // User needs to accept if:
      // 1. They haven't accepted any terms yet
      // 2. The current terms version is different from what they accepted
      const needsToAccept = !profile?.terms_accepted_at || 
                           profile?.terms_version !== terms.version;

      setNeedsAcceptance(needsToAccept);
    } catch (err) {
      console.error('Error checking terms acceptance:', err);
      setNeedsAcceptance(false);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsAccepted = () => {
    setNeedsAcceptance(false);
  };

  return { needsAcceptance, isLoading, markAsAccepted };
};