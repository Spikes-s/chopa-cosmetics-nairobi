import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { MessageSquare, User, Send, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

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
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

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
      .channel('chat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => [newMsg, ...prev]);
        
        if (newMsg.sender_type === 'customer') {
          setNewMessageIds(prev => new Set([...prev, newMsg.id]));
          sonnerToast.info('New Message!', {
            description: newMsg.message.substring(0, 50) + (newMsg.message.length > 50 ? '...' : ''),
            icon: <Bell className="w-4 h-4" />,
            duration: 8000,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('id', messageId);
    
    setNewMessageIds(prev => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !replyTo) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: replyTo,
        sender_type: 'admin',
        message: replyMessage,
        is_read: false,
      }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    } else {
      setReplyMessage('');
      setReplyTo(null);
      toast({
        title: 'Success',
        description: 'Reply sent',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Messages ({messages.length})</h2>
      </div>

      {messages.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No messages yet. Customer messages will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        messages.map(msg => (
          <Card 
            key={msg.id} 
            className={`glass-card transition-all ${
              newMessageIds.has(msg.id) 
                ? 'ring-2 ring-blue-500' 
                : ''
            }`}
            onClick={() => msg.sender_type === 'customer' && !msg.is_read && markAsRead(msg.id)}
          >
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
                      <Badge variant="destructive" className="text-xs animate-pulse">New</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), 'PPp')}
                    </span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                  
                  {msg.sender_type === 'customer' && msg.user_id && (
                    <div className="mt-2">
                      {replyTo === msg.user_id ? (
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Type your reply..."
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            className="min-h-[60px]"
                          />
                          <div className="flex flex-col gap-1">
                            <Button size="sm" onClick={sendReply}>
                              <Send className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setReplyTo(msg.user_id)}
                        >
                          Reply
                        </Button>
                      )}
                    </div>
                  )}
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
