import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Gift, Users } from 'lucide-react';
import { toast } from 'sonner';

const KEYS = [
  { key: 'loyalty_earn_ksh_per_point', label: 'Ksh spent per 1 point earned', default: '10',
    help: 'Customer earns 1 loyalty point for every Ksh spent (e.g. 10 = 1pt / Ksh 10).' },
  { key: 'loyalty_redeem_points_per_ksh', label: 'Points needed for Ksh 1 discount', default: '10',
    help: 'Redemption rate (e.g. 10 = 100 pts gives Ksh 10 off).' },
  { key: 'referral_reward_points', label: 'Referrer reward (points)', default: '500',
    help: 'Points the referring VIP earns when the referee places their first order.' },
  { key: 'referral_bonus_points', label: 'Referee bonus (points)', default: '250',
    help: 'Points the new customer gets on their first order after signup with a referral code.' },
];

const LoyaltyRatesManager = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_settings')
      .select('key,value')
      .in('key', KEYS.map(k => k.key));
    if (error) { toast.error('Failed to load loyalty settings'); setLoading(false); return; }
    const map: Record<string, string> = {};
    KEYS.forEach(k => { map[k.key] = k.default; });
    (data || []).forEach((row: any) => { map[row.key] = row.value ?? ''; });
    setValues(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    for (const k of KEYS) {
      const raw = (values[k.key] ?? '').trim();
      const n = Number(raw);
      if (!raw || Number.isNaN(n) || n < 0 || n > 100000) {
        toast.error(`Invalid value for "${k.label}"`);
        return;
      }
    }
    setSaving(true);
    const rows = KEYS.map(k => ({ key: k.key, value: String(values[k.key]).trim() }));
    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Loyalty & referral rates updated');
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" />
          Loyalty & Referral Rates
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Tune how points are earned, redeemed and awarded for referrals. Changes take effect on the next order.
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Gift className="w-4 h-4" /> Loyalty points</CardTitle>
          <CardDescription>Controls how customers accrue and burn points on orders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {KEYS.slice(0, 2).map(k => (
            <div key={k.key} className="space-y-1.5">
              <Label htmlFor={k.key}>{k.label}</Label>
              <Input
                id={k.key}
                type="number"
                min={1}
                value={values[k.key] ?? ''}
                onChange={(e) => setValues(v => ({ ...v, [k.key]: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{k.help}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Users className="w-4 h-4" /> Referral rewards</CardTitle>
          <CardDescription>Points awarded when a referred customer places their first order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {KEYS.slice(2).map(k => (
            <div key={k.key} className="space-y-1.5">
              <Label htmlFor={k.key}>{k.label}</Label>
              <Input
                id={k.key}
                type="number"
                min={0}
                value={values[k.key] ?? ''}
                onChange={(e) => setValues(v => ({ ...v, [k.key]: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{k.help}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save rates
        </Button>
      </div>
    </div>
  );
};

export default LoyaltyRatesManager;
