import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('id, title, message, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setAnnouncements(data);
        // Check which are unread (stored locally)
        const readIds = JSON.parse(localStorage.getItem('chopa-read-notifications') || '[]');
        const unread = data.filter(a => !readIds.includes(a.id));
        setUnreadCount(unread.length);
      }
    };

    fetchAnnouncements();

    // Realtime
    const channel = supabase
      .channel('announcements-bell')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements',
      }, (payload) => {
        const a = payload.new as Announcement;
        setAnnouncements(prev => [a, ...prev].slice(0, 10));
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && announcements.length > 0) {
      const readIds = announcements.map(a => a.id);
      localStorage.setItem('chopa-read-notifications', JSON.stringify(readIds));
      setUnreadCount(0);
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto p-0">
        <div className="p-3 border-b border-border">
          <p className="font-semibold text-sm">Notifications</p>
        </div>
        {announcements.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No notifications yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {announcements.map((a) => (
              <div key={a.id} className="p-3 hover:bg-muted/50 transition-colors">
                <p className="font-medium text-sm text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.message}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
