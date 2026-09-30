import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Eye, LogOut, Clock, Radio } from 'lucide-react';

interface Visit {
  visitor_id: string | null;
  session_id: string | null;
  visited_at: string;
  last_seen_at: string | null;
  page_path: string;
}

const fmtDuration = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
};

const VisitorAnalytics = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('page_visits')
      .select('visitor_id, session_id, visited_at, last_seen_at, page_path')
      .gte('visited_at', start.toISOString())
      .order('visited_at', { ascending: false })
      .limit(5000);
    if (error) setError('Could not load visitor data.');
    else {
      setVisits(data as Visit[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-page-visits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_visits' }, () => load())
      .subscribe();
    const tick = setInterval(() => { setNow(Date.now()); load(); }, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, [load]);

  const stats = useMemo(() => {
    const visitors = new Set(visits.map((v) => v.visitor_id).filter(Boolean));
    const sessions = new Map<string, { views: number; start: number; end: number }>();
    for (const v of visits) {
      const key = v.session_id || `${v.visitor_id}-${v.visited_at}`;
      const start = new Date(v.visited_at).getTime();
      const end = new Date(v.last_seen_at || v.visited_at).getTime();
      const s = sessions.get(key);
      if (!s) sessions.set(key, { views: 1, start, end });
      else {
        s.views++;
        s.start = Math.min(s.start, start);
        s.end = Math.max(s.end, end);
      }
    }
    const list = [...sessions.values()];
    const bounces = list.filter((s) => s.views === 1).length;
    const avg = list.length ? list.reduce((a, s) => a + (s.end - s.start), 0) / list.length : 0;
    const liveCutoff = now - 60000;
    const live = new Set(
      visits
        .filter((v) => new Date(v.last_seen_at || v.visited_at).getTime() >= liveCutoff)
        .map((v) => v.visitor_id),
    ).size;
    const pages = new Map<string, number>();
    visits.forEach((v) => pages.set(v.page_path, (pages.get(v.page_path) || 0) + 1));
    const topPages = [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      visitors: visitors.size,
      views: visits.length,
      bounceRate: list.length ? Math.round((bounces / list.length) * 100) : 0,
      avg,
      live,
      topPages,
    };
  }, [visits, now]);

  const tiles = [
    { label: "Today's Visitors", value: stats.visitors.toLocaleString(), icon: Users },
    { label: 'Page Views Today', value: stats.views.toLocaleString(), icon: Eye },
    { label: 'Bounce Rate', value: `${stats.bounceRate}%`, icon: LogOut },
    { label: 'Avg. Session', value: fmtDuration(stats.avg), icon: Clock },
  ];

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Visitors Today</CardTitle>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Radio className="w-4 h-4 text-primary animate-pulse" />
          {stats.live} online now
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiles.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="w-4 h-4 text-primary" /> {label}
              </div>
              <p className="text-xl font-bold mt-1">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>
        {stats.topPages.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Top pages today</p>
            <ul className="space-y-1 text-sm">
              {stats.topPages.map(([path, n]) => (
                <li key={path} className="flex justify-between">
                  <span className="text-muted-foreground truncate">{path}</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VisitorAnalytics;
