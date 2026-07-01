import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

/** Returns true if the signed-in user's email is an active VIP member. */
export function useIsVIP() {
  const { user } = useAuth();
  const [isVIP, setIsVIP] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    if (!user?.email) { setIsVIP(false); setLoading(false); return; }
    (async () => {
      try {
        const { data } = await (supabase.rpc as any)('is_active_vip', { _email: user.email });
        if (!cancel) setIsVIP(!!data);
      } catch { if (!cancel) setIsVIP(false); }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [user?.email]);

  return { isVIP, loading };
}

export interface DisplayPrice { price: number; original?: number; isVipPrice: boolean; }

export function getDisplayPrice(retail: number, wholesale: number | null | undefined, isVIP: boolean): DisplayPrice {
  if (isVIP && wholesale && wholesale > 0 && wholesale < retail) {
    return { price: wholesale, original: retail, isVipPrice: true };
  }
  return { price: retail, isVipPrice: false };
}
