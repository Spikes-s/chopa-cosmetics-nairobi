import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SiteStatus = 'active' | 'shutdown' | 'loading';

export const useSiteStatus = () => {
  const [status, setStatus] = useState<SiteStatus>('loading');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    // Fetch initial site status
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('site_controls')
        .select('value')
        .eq('key', 'site_status')
        .single();

      if (!error && data) {
        setStatus(data.value === 'shutdown' ? 'shutdown' : 'active');
      } else {
        // Default to active if no status found
        setStatus('active');
      }
    };

    // Check if current user is admin
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'super_admin']);

      setIsAdmin(roleData && roleData.length > 0);
    };

    fetchStatus();
    checkAdminStatus();

    // Subscribe to real-time changes on site_controls
    const channel = supabase
      .channel('site_status_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'site_controls',
          filter: 'key=eq.site_status'
        },
        (payload) => {
          const newValue = payload.new?.value;
          setStatus(newValue === 'shutdown' ? 'shutdown' : 'active');
        }
      )
      .subscribe();

    // Subscribe to auth changes to update admin status
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => {
      supabase.removeChannel(channel);
      authListener.subscription.unsubscribe();
    };
  }, []);

  return {
    status,
    isAdmin,
    isBlocked: status === 'shutdown' && isAdmin === false,
    isLoading: status === 'loading' || isAdmin === null
  };
};
