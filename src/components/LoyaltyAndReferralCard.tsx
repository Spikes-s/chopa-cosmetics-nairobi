import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Copy, Users, Gift } from 'lucide-react';
import { toast } from 'sonner';

interface LoyaltyData { points_balance: number; lifetime_earned: number; lifetime_redeemed: number; }
interface ReferralData { code: string; total_referrals: number; total_rewards_earned: number; }

export function LoyaltyAndReferralCard() {
  const { user } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [l, r] = await Promise.all([
      supabase.from('loyalty_accounts' as any).select('points_balance,lifetime_earned,lifetime_redeemed').eq('user_id', user.id).maybeSingle(),
      (supabase.rpc as any)('get_or_create_referral_code', { _user_id: user.id }),
    ]);
    setLoyalty((l.data as any) ?? { points_balance: 0, lifetime_earned: 0, lifetime_redeemed: 0 });
    if (r.data) {
      const { data: codeRow } = await supabase.from('referral_codes' as any)
        .select('code,total_referrals,total_rewards_earned').eq('user_id', user.id).maybeSingle();
      setReferral(codeRow as any);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const referralLink = referral ? `${window.location.origin}/auth?ref=${referral.code}` : '';
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied! 💎');
  };

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      <Card className="gold-glow border-accent/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent" /> Loyalty Points</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-display font-bold text-accent">{loyalty?.points_balance?.toLocaleString() ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">100 pts = Ksh 10 off at checkout</p>
          <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
            <span>Earned: <b className="text-green-600">{loyalty?.lifetime_earned ?? 0}</b></span>
            <span>Redeemed: <b className="text-primary">{loyalty?.lifetime_redeemed ?? 0}</b></span>
          </div>
        </CardContent>
      </Card>
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Refer & Earn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Gift className="w-3 h-3" /> Earn <b>500 pts</b> per friend's first order. They get <b>250 pts</b> too!</p>
          <div className="flex gap-2 items-center bg-muted rounded-lg p-2">
            <code className="text-xs flex-1 truncate">{referral?.code || '—'}</code>
            <Button size="sm" variant="ghost" onClick={copyLink}><Copy className="w-3 h-3" /></Button>
          </div>
          <p className="text-xs text-muted-foreground"><b>{referral?.total_referrals ?? 0}</b> friends joined · <b>{referral?.total_rewards_earned ?? 0}</b> pts earned</p>
        </CardContent>
      </Card>
    </div>
  );
}
