import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Share2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Platform = Database['public']['Enums']['social_platform'];

const PLATFORMS: Platform[] = [
  'facebook', 'instagram', 'tiktok', 'whatsapp', 'telegram',
  'youtube', 'pinterest', 'linkedin', 'x', 'threads', 'website', 'phone', 'email',
];

interface Row {
  id: string;
  platform: Platform;
  handle_or_url: string;
  is_active: boolean;
  sort_order: number;
}

const SocialLinksManager = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<{ platform: Platform; handle_or_url: string }>({
    platform: 'instagram', handle_or_url: '',
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('social_links')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addRow = async () => {
    if (!draft.handle_or_url.trim()) {
      toast({ title: 'Missing value', description: 'Handle or URL required', variant: 'destructive' });
      return;
    }
    const nextOrder = (rows[rows.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await supabase.from('social_links').insert({
      platform: draft.platform,
      handle_or_url: draft.handle_or_url.trim(),
      sort_order: nextOrder,
      is_active: true,
    });
    if (error) return toast({ title: 'Insert failed', description: error.message, variant: 'destructive' });
    setDraft({ platform: 'instagram', handle_or_url: '' });
    load();
  };

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from('social_links').update(patch).eq('id', id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this social link?')) return;
    const { error } = await supabase.from('social_links').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else load();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const swap = idx + dir;
    if (swap < 0 || swap >= rows.length) return;
    const a = rows[idx], b = rows[swap];
    await Promise.all([
      supabase.from('social_links').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('social_links').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    load();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Share2 className="w-5 h-5" /> Social Media Links</CardTitle>
        <CardDescription>Shown in the footer and contact page. Toggle to hide without deleting.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-4 rounded-lg border border-border">
          <div>
            <Label>Platform</Label>
            <Select value={draft.platform} onValueChange={(v) => setDraft({ ...draft, platform: v as Platform })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Handle or URL</Label>
            <Input value={draft.handle_or_url} onChange={(e) => setDraft({ ...draft, handle_or_url: e.target.value })} placeholder="@chopacosmetics or https://..." />
          </div>
          <div>
            <Button onClick={addRow} className="gap-2 w-full"><Plus className="w-4 h-4" /> Add</Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No social links yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === rows.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                </div>
                <Select value={r.platform} onValueChange={(v) => update(r.id, { platform: v as Platform })}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="flex-1 min-w-[220px]" value={r.handle_or_url} onChange={(e) => update(r.id, { handle_or_url: e.target.value })} />
                <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} />
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SocialLinksManager;
