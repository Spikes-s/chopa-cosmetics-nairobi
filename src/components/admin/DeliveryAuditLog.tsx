import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, RefreshCw } from 'lucide-react';

type Vals = Record<string, unknown> | null;
interface AuditRow {
  id: string;
  action: string;
  changed_by_email: string | null;
  old_values: Vals;
  new_values: Vals;
  created_at: string;
}

const LABELS: Record<string, string> = {
  name: 'Name', region: 'Region', price: 'Fee (Ksh)', waiver_threshold: 'Waiver threshold',
  waiver_fee: 'Waiver fee', is_active: 'Offered',
};
const fmt = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));

const DeliveryAuditLog = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('delivery_location_audit')
      .select('id, action, changed_by_email, old_values, new_values, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    setRows((data as AuditRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Delivery Price Change Log</CardTitle>
          <CardDescription>Every change to delivery locations, with who made it and when.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">No changes recorded yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {rows.map((r) => {
              const name = fmt((r.new_values ?? r.old_values)?.name);
              const changes = Object.keys(LABELS).filter(
                (k) => r.action === 'updated' && fmt(r.old_values?.[k]) !== fmt(r.new_values?.[k]),
              );
              return (
                <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.action === 'deleted' ? 'destructive' : 'secondary'} className="capitalize">{r.action}</Badge>
                      <span className="font-medium">{name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()} · {r.changed_by_email || 'System'}
                    </span>
                  </div>
                  {changes.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {changes.map((k) => (
                        <li key={k}>{LABELS[k]}: <s>{fmt(r.old_values?.[k])}</s> → <span className="text-foreground">{fmt(r.new_values?.[k])}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryAuditLog;
