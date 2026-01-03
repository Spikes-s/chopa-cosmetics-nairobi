import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MessageSquare, User } from 'lucide-react';

interface ChatMessage {
  id: string;
  user_id: string | null;
  sender_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const MessagesManager = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMessages(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('chat-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No messages yet. Customer messages will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        messages.map(msg => (
          <Card key={msg.id} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={msg.sender_type === 'admin' ? 'default' : 'secondary'}>
                      {msg.sender_type === 'admin' ? 'Admin' : 'Customer'}
                    </Badge>
                    {!msg.is_read && msg.sender_type === 'customer' && (
                      <Badge variant="destructive" className="text-xs">New</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), 'PPp')}
                    </span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default MessagesManager;
