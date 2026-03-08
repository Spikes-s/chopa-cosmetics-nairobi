import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Gift, Loader2 } from 'lucide-react';

interface BundleDeal {
  id: string;
  name: string;
  description: string | null;
  bundle_type: string;
  buy_quantity: number;
  get_quantity: number;
  discount_percent: number;
  category_filter: string | null;
  is_active: boolean;
  ends_at: string | null;
}

const BundleDealsManager = () => {
  const { toast } = useToast();
  const [deals, setDeals] = useState<BundleDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    bundle_type: 'buy_x_get_y',
    buy_quantity: 3,
    get_quantity: 1,
    discount_percent: 0,
    category_filter: '',
    ends_at: '',
  });

  const fetchDeals = async () => {
    const { data } = await supabase
      .from('bundle_deals')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setDeals(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchDeals(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('bundle_deals').insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      bundle_type: form.bundle_type,
      buy_quantity: form.buy_quantity,
      get_quantity: form.get_quantity,
      discount_percent: form.discount_percent,
      category_filter: form.category_filter.trim() || null,
      ends_at: form.ends_at || null,
    } as any);
    
    if (error) {
      toast({ title: 'Error creating deal', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Bundle deal created!' });
      setForm({ name: '', description: '', bundle_type: 'buy_x_get_y', buy_quantity: 3, get_quantity: 1, discount_percent: 0, category_filter: '', ends_at: '' });
      setShowForm(false);
      fetchDeals();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('bundle_deals').update({ is_active: !current } as any).eq('id', id);
    fetchDeals();
  };

  const deleteDeal = async (id: string) => {
    if (!confirm('Delete this bundle deal?')) return;
    await supabase.from('bundle_deals').delete().eq('id', id);
    toast({ title: 'Deal deleted' });
    fetchDeals();
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Bundle Deals
        </CardTitle>
        <Button onClick={() => setShowForm(!showForm)} size="sm" variant={showForm ? 'outline' : 'default'}>
          {showForm ? 'Cancel' : <><Plus className="w-4 h-4 mr-1" /> New Deal</>}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Deal Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Buy 3 Get 1 Free Braids" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.bundle_type} onValueChange={v => setForm(f => ({ ...f, bundle_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                      <SelectItem value="combo_discount">Combo Discount %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the deal..." rows={2} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {form.bundle_type === 'buy_x_get_y' ? (
                  <>
                    <div>
                      <Label>Buy Quantity</Label>
                      <Input type="number" value={form.buy_quantity} onChange={e => setForm(f => ({ ...f, buy_quantity: Number(e.target.value) }))} min={1} />
                    </div>
                    <div>
                      <Label>Get Free</Label>
                      <Input type="number" value={form.get_quantity} onChange={e => setForm(f => ({ ...f, get_quantity: Number(e.target.value) }))} min={1} />
                    </div>
                  </>
                ) : (
                  <div>
                    <Label>Discount %</Label>
                    <Input type="number" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: Number(e.target.value) }))} min={1} max={99} />
                  </div>
                )}
                <div>
                  <Label>Category (optional)</Label>
                  <Input value={form.category_filter} onChange={e => setForm(f => ({ ...f, category_filter: e.target.value }))} placeholder="e.g. braids" />
                </div>
                <div>
                  <Label>Ends At (optional)</Label>
                  <Input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Deal
              </Button>
            </CardContent>
          </Card>
        )}

        {deals.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No bundle deals yet. Create one above!</p>
        ) : (
          <div className="space-y-3">
            {deals.map(deal => (
              <div key={deal.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{deal.name}</span>
                    <Badge variant={deal.is_active ? 'default' : 'secondary'}>
                      {deal.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">
                      {deal.bundle_type === 'buy_x_get_y' 
                        ? `Buy ${deal.buy_quantity} Get ${deal.get_quantity} Free` 
                        : `${deal.discount_percent}% Off Combo`}
                    </Badge>
                  </div>
                  {deal.description && <p className="text-sm text-muted-foreground">{deal.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={deal.is_active} onCheckedChange={() => toggleActive(deal.id, deal.is_active)} />
                  <Button variant="ghost" size="icon" onClick={() => deleteDeal(deal.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BundleDealsManager;
