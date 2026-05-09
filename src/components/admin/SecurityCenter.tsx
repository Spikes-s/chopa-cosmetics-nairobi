import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Shield, ShieldAlert, ShieldCheck, Search, Download, RefreshCw,
  AlertTriangle, Activity, Lock, Unlock, UserX, Key, Eye, Loader2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface LockedAccount {
  id: string;
  email: string;
  failed_count: number;
  locked_until: string | null;
  last_failed_at: string | null;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id: string | null;
  target_user_id: string | null;
  ip_address: string | null;
  details: Record<string, any>;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
  info: 'bg-muted text-muted-foreground',
};

const EVENT_ICONS: Record<string, typeof Shield> = {
  login_failed: UserX,
  login_success: Key,
  role_change: Shield,
  password_change: Lock,
  account_locked: ShieldAlert,
  admin_action: Activity,
};

const SecurityCenter = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [lockedAccounts, setLockedAccounts] = useState<LockedAccount[]>([]);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const fetchLockedAccounts = useCallback(async () => {
    const { data, error } = await (supabase.from as any)('account_lockouts')
      .select('id, email, failed_count, locked_until, last_failed_at')
      .or('locked_until.gte.' + new Date().toISOString() + ',failed_count.gte.3')
      .order('last_failed_at', { ascending: false })
      .limit(50);
    if (!error) setLockedAccounts((data as LockedAccount[]) || []);
  }, []);

  const handleUnlock = async (email: string) => {
    setUnlocking(email);
    const { error } = await (supabase.rpc as any)('admin_unlock_account', { _email: email });
    setUnlocking(null);
    if (error) { toast.error(error.message || 'Failed to unlock'); return; }
    toast.success(`Unlocked ${email}`);
    fetchLockedAccounts();
    fetchEvents();
  };

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'super_admin').maybeSingle()
      .then(({ data }) => { setIsSuperAdmin(!!data); setChecking(false); });
  }, [user]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('security_events').select('*').order('created_at', { ascending: false }).limit(200);
    if (severityFilter !== 'all') query = query.eq('severity', severityFilter);
    if (typeFilter !== 'all') query = query.eq('event_type', typeFilter);
    const { data, error } = await query;
    if (error) { toast.error('Failed to load security events'); }
    else { setEvents((data as SecurityEvent[]) || []); }
    setLoading(false);
  }, [severityFilter, typeFilter]);

  useEffect(() => { if (isSuperAdmin) { fetchEvents(); fetchLockedAccounts(); } }, [isSuperAdmin, fetchEvents, fetchLockedAccounts]);

  // Realtime
  useEffect(() => {
    if (!isSuperAdmin) return;
    const channel = supabase.channel('security-events-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_events' }, (payload) => {
        setEvents(prev => [payload.new as SecurityEvent, ...prev].slice(0, 200));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isSuperAdmin]);

  const filtered = events.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.event_type.includes(s) || e.ip_address?.includes(s) || JSON.stringify(e.details).toLowerCase().includes(s);
  });

  const exportCSV = () => {
    const rows = [['Date', 'Type', 'Severity', 'IP', 'Details']];
    filtered.forEach(e => rows.push([
      format(new Date(e.created_at), 'yyyy-MM-dd HH:mm:ss'),
      e.event_type, e.severity, e.ip_address || '', JSON.stringify(e.details),
    ]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `security-audit-${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Audit log exported');
  };

  const stats = {
    total: events.length,
    critical: events.filter(e => e.severity === 'critical').length,
    high: events.filter(e => e.severity === 'high').length,
    failedLogins: events.filter(e => e.event_type === 'login_failed').length,
    roleChanges: events.filter(e => e.event_type === 'role_change').length,
  };

  if (checking) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!isSuperAdmin) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">Only the Super Admin can access the Security Center.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Security Center
          </h2>
          <p className="text-muted-foreground text-sm">Real-time security monitoring & audit logs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Events', value: stats.total, icon: Activity, color: 'text-foreground' },
          { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'High', value: stats.high, icon: ShieldAlert, color: 'text-orange-500' },
          { label: 'Failed Logins', value: stats.failedLogins, icon: UserX, color: 'text-yellow-500' },
          { label: 'Role Changes', value: stats.roleChanges, icon: Shield, color: 'text-blue-500' },
        ].map(s => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Event Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="login_failed">Failed Login</SelectItem>
            <SelectItem value="login_success">Login Success</SelectItem>
            <SelectItem value="role_change">Role Change</SelectItem>
            <SelectItem value="password_change">Password Change</SelectItem>
            <SelectItem value="admin_action">Admin Action</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events List */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No security events recorded yet</p>
              <p className="text-xs mt-1">Events will appear here as they occur</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(event => {
            const Icon = EVENT_ICONS[event.event_type] || Activity;
            return (
              <Card key={event.id} className="glass-card hover:bg-muted/30 transition-colors">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-0.5">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm capitalize">{event.event_type.replace(/_/g, ' ')}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.info}`}>
                        {event.severity}
                      </Badge>
                    </div>
                    {event.details && Object.keys(event.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {Object.entries(event.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                    )}
                    <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground/70">
                      {event.ip_address && <span>IP: {event.ip_address}</span>}
                      <span>{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SecurityCenter;
