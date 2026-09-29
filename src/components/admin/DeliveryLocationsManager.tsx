import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Truck, Search, Plus, Trash2, Save, RefreshCw } from 'lucide-react';

interface LocationRow {
  id: string;
  code: string;
  name: string;
  region: string;
  price: number;
  is_active: boolean;
  display_order: number;
  waiver_threshold: number | null;
  waiver_fee: number;
}

type Draft = { price: string; name: string; region: string; threshold: string; waiverFee: string };
const toDraft = (r: LocationRow): Draft => ({ price: String(r.price), name: r.name, region: r.region, threshold: r.waiver_threshold === null ? '' : String(r.waiver_threshold), waiverFee: String(r.waiver_fee) });
const normalize = (r: any): LocationRow => ({ ...r, price: Number(r.price) || 0, region: r.region || '', waiver_threshold: r.waiver_threshold === null || r.waiver_threshold === undefined ? null : Number(r.waiver_threshold), waiver_fee: Number(r.waiver_fee) || 0 });

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const DeliveryLocationsManager = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [newLocation, setNewLocation] = useState({ name: '', region: '', price: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('delivery_locations')
      .select('id, code, name, region, price, is_active, display_order, waiver_threshold, waiver_fee')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: 'Could not load delivery locations', variant: 'destructive' });
    } else {
      const list = (data || []).map(normalize);
      setRows(list);
      setDrafts(
        Object.fromEntries(
          list.map((r) => [r.id, toDraft(r)]),
        ),
      );
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.region.toLowerCase().includes(q));
  }, [rows, query]);

  const isDirty = (row: LocationRow) => {
    const draft = drafts[row.id];
    if (!draft) return false;
    return (
      draft.name.trim() !== row.name ||
      draft.region.trim() !== row.region ||
      Number(draft.price) !== row.price ||
      (draft.threshold.trim() === '' ? null : Number(draft.threshold)) !== row.waiver_threshold ||
      Number(draft.waiverFee || '0') !== row.waiver_fee
    );
  };

  const saveRow = async (row: LocationRow) => {
    const draft = drafts[row.id];
    if (!draft) return;
    const price = Number(draft.price);
    if (!draft.name.trim()) {
      toast({ title: 'Name required', description: 'Give the location a name.', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(price) || price < 0 || price > 100000) {
      toast({ title: 'Invalid price', description: 'Enter a price between 0 and 100,000.', variant: 'destructive' });
      return;
    }

    const waiver_threshold = draft.threshold.trim() === '' ? null : Number(draft.threshold);
    const waiver_fee = Number(draft.waiverFee || '0');
    if (waiver_threshold !== null && (!Number.isFinite(waiver_threshold) || waiver_threshold < 0)) {
      toast({ title: 'Invalid threshold', description: 'Enter a valid order amount or leave blank.', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(waiver_fee) || waiver_fee < 0 || waiver_fee > price) {
      toast({ title: 'Invalid waiver fee', description: 'Waiver fee must be between 0 and the normal fee.', variant: 'destructive' });
      return;
    }
    setSavingId(row.id);
    const { error } = await supabase
      .from('delivery_locations')
      .update({ name: draft.name.trim(), region: draft.region.trim(), price, waiver_threshold, waiver_fee })
      .eq('id', row.id);
    setSavingId(null);

    if (error) {
      toast({ title: 'Error', description: 'Could not save this location', variant: 'destructive' });
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, name: draft.name.trim(), region: draft.region.trim(), price, waiver_threshold, waiver_fee } : r)),
    );
    toast({ title: 'Saved', description: `${draft.name.trim()} — Ksh ${price.toLocaleString()}` });
  };

  const toggleActive = async (row: LocationRow, active: boolean) => {
    const { error } = await supabase.from('delivery_locations').update({ is_active: active }).eq('id', row.id);
    if (error) {
      toast({ title: 'Error', description: 'Could not update availability', variant: 'destructive' });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: active } : r)));
  };

  const removeRow = async (row: LocationRow) => {
    if (!confirm(`Remove "${row.name}" from delivery locations?`)) return;
    const { error } = await supabase.from('delivery_locations').delete().eq('id', row.id);
    if (error) {
      toast({ title: 'Error', description: 'Could not remove this location', variant: 'destructive' });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast({ title: 'Removed', description: `${row.name} is no longer offered.` });
  };

  const addLocation = async () => {
    const name = newLocation.name.trim();
    const price = Number(newLocation.price || '0');
    if (!name) {
      toast({ title: 'Name required', description: 'Enter a location name.', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(price) || price < 0 || price > 100000) {
      toast({ title: 'Invalid price', description: 'Enter a price between 0 and 100,000.', variant: 'destructive' });
      return;
    }

    setAdding(true);
    const { data, error } = await supabase
      .from('delivery_locations')
      .insert({
        code: slugify(name) || `loc_${Date.now()}`,
        name,
        region: newLocation.region.trim(),
        price,
        display_order: (rows[rows.length - 1]?.display_order ?? 0) + 1,
      })
      .select('id, code, name, region, price, is_active, display_order, waiver_threshold, waiver_fee')
      .maybeSingle();
    setAdding(false);

    if (error || !data) {
      toast({
        title: 'Error',
        description: error?.code === '23505' ? 'That location already exists.' : 'Could not add this location',
        variant: 'destructive',
      });
      return;
    }

    const row = normalize(data);
    setRows((prev) => [...prev, row]);
    setDrafts((prev) => ({ ...prev, [row.id]: toDraft(row) }));
    setNewLocation({ name: '', region: '', price: '' });
    toast({ title: 'Location added', description: `${row.name} — Ksh ${row.price.toLocaleString()}` });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Delivery Locations & Prices
            </CardTitle>
            <CardDescription>
              Set the delivery fee (Ksh) for each location customers can choose at checkout.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Add new */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium">Add a location</p>
          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_0.7fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="new-loc-name" className="text-xs">Location name</Label>
              <Input
                id="new-loc-name"
                placeholder="e.g. Kabete"
                value={newLocation.name}
                onChange={(e) => setNewLocation((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-loc-region" className="text-xs">Region / County</Label>
              <Input
                id="new-loc-region"
                placeholder="e.g. Kiambu"
                value={newLocation.region}
                onChange={(e) => setNewLocation((p) => ({ ...p, region: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-loc-price" className="text-xs">Price (Ksh)</Label>
              <Input
                id="new-loc-price"
                type="number"
                min={0}
                placeholder="0"
                value={newLocation.price}
                onChange={(e) => setNewLocation((p) => ({ ...p, price: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addLocation} disabled={adding} className="gap-2 w-full md:w-auto">
                <Plus className="w-4 h-4" /> {adding ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations…"
            className="pl-9"
            aria-label="Search delivery locations"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No delivery locations match your search.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {rows.length} locations
            </p>
            <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
              {filtered.map((row) => {
                const draft = drafts[row.id] || toDraft(row);
                return (
                  <div
                    key={row.id}
                    className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1.2fr_1fr_0.7fr_0.8fr_0.7fr_auto_auto]"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <Input
                        value={draft.name}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, name: e.target.value } }))
                        }
                        aria-label={`Name for ${row.name}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Region</Label>
                      <Input
                        value={draft.region}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, region: e.target.value } }))
                        }
                        aria-label={`Region for ${row.name}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Price (Ksh)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={draft.price}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, price: e.target.value } }))
                        }
                        aria-label={`Delivery price for ${row.name}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Waive if order ≥ (Ksh)</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="No waiver"
                        value={draft.threshold}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, threshold: e.target.value } }))}
                        aria-label={`Waiver threshold for ${row.name}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fee then (Ksh)</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0 = free"
                        value={draft.waiverFee}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, waiverFee: e.target.value } }))}
                        aria-label={`Reduced fee for ${row.name}`}
                        disabled={draft.threshold.trim() === ''}
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex flex-col items-start gap-1">
                        <Label className="text-xs text-muted-foreground">Offered</Label>
                        <div className="flex items-center gap-2 h-10">
                          <Switch
                            checked={row.is_active}
                            onCheckedChange={(v) => toggleActive(row, v)}
                            aria-label={`Toggle availability for ${row.name}`}
                          />
                          {row.price === 0 && <Badge variant="secondary">Free</Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveRow(row)}
                        disabled={savingId === row.id || !isDirty(row)}
                        className="gap-1"
                      >
                        <Save className="w-4 h-4" />
                        {savingId === row.id ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeRow(row)}
                        aria-label={`Remove ${row.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryLocationsManager;
