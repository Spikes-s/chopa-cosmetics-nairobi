import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react';

interface Row {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
}

const WebsiteLinksManager = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ label: '', url: '', icon: '', color: '#ec4899' });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('website_links')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addRow = async () => {
    if (!draft.label.trim() || !draft.url.trim()) {
      toast({ title: 'Missing fields', description: 'Label and URL are required', variant: 'destructive' });
      return;
    }
    const nextOrder = (rows[rows.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await supabase.from('website_links').insert({
      label: draft.label.trim(),
      url: draft.url.trim(),
      icon: draft.icon.trim() || null,
      color: draft.color || null,
      sort_order: nextOrder,
      is_active: true,
    });
    if (error) return toast({ title: 'Insert failed', description: error.message, variant: 'destructive' });
    setDraft({ label: '', url: '', icon: '', color: '#ec4899' });
    load();
  };

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from('website_links').update(patch).eq('id', id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this link?')) return;
    const { error } = await supabase.from('website_links').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else load();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const swap = idx + dir;
    if (swap < 0 || swap >= rows.length) return;
    const a = rows[idx], b = rows[swap];
    await Promise.all([
      supabase.from('website_links').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('website_links').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    load();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ExternalLink className="w-5 h-5" /> Website Links</CardTitle>
        <CardDescription>External sites and quick links shown in the footer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end p-4 rounded-lg border border-border">
          <div className="md:col-span-1">
            <Label>Label</Label>
            <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Blog" />
          </div>
          <div className="md:col-span-2">
            <Label>URL</Label>
            <Input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <Label>Icon (lucide name)</Label>
            <Input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} placeholder="ExternalLink" />
          </div>
          <div>
            <Label>Color</Label>
            <Input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
          </div>
          <div className="md:col-span-5">
            <Button onClick={addRow} className="gap-2"><Plus className="w-4 h-4" /> Add Link</Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No links yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === rows.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                </div>
                <Input className="flex-1 min-w-[140px]" value={r.label} onChange={(e) => update(r.id, { label: e.target.value })} />
                <Input className="flex-1 min-w-[220px]" value={r.url} onChange={(e) => update(r.id, { url: e.target.value })} />
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

export default WebsiteLinksManager;
