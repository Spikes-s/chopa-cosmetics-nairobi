import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  user_id: string | null;
  sender_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages for the current user
  const fetchMessages = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      // Check for unread admin messages
      const unreadAdminMessages = data.filter(
        m => m.sender_type === 'admin' && !m.is_read
      );
      setHasUnread(unreadAdminMessages.length > 0);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMessages();

      // Subscribe to real-time updates for this user's messages
      const channel = supabase
        .channel(`chat-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMsg]);
          
          // Show unread indicator if admin message and widget is closed
          if (newMsg.sender_type === 'admin' && !isOpen) {
            setHasUnread(true);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isOpen]);

  // Mark messages as read when opening chat
  const markMessagesAsRead = async () => {
    if (!user) return;

    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('sender_type', 'admin')
      .eq('is_read', false);

    setHasUnread(false);
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
    markMessagesAsRead();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setIsSending(true);

    const { error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: user.id,
        sender_type: 'customer',
        message: newMessage.trim(),
        is_read: false,
      }]);

    if (!error) {
      setNewMessage('');
    }

    setIsSending(false);
  };

  // Show widget for all users (logged in gets full chat, others see login prompt)
  // Always render the floating button for visibility

  return (
    <>
      {/* Floating button - always visible and fixed */}
      {!isOpen && (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-6 left-6 z-[9999] w-14 h-14 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all hover:scale-105 flex items-center justify-center"
          style={{ position: 'fixed', boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)' }}
        >
          <MessageCircle className="w-6 h-6" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-black text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              !
            </span>
          )}
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div 
          className={`fixed left-6 z-[9999] transition-all duration-300 ${
            isMinimized 
              ? 'bottom-6 w-64' 
              : 'bottom-6 w-80 sm:w-96'
          }`}
          style={{ position: 'fixed' }}
        >
          <Card className="glass-card border-primary/20 shadow-2xl overflow-hidden">
            {/* Header */}
            <CardHeader className="p-3 bg-primary/10 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Chat Support
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    <Minimize2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {!isMinimized && (
              <CardContent className="p-0">
                {/* Show login prompt if not authenticated */}
                {!user ? (
                  <div className="h-72 flex items-center justify-center p-6 text-center">
                    <div>
                      <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm text-foreground font-medium mb-2">
                        Sign in to chat with us!
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Create an account or log in to start a conversation with our support team.
                      </p>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => {
                          setIsOpen(false);
                          window.location.href = '/auth';
                        }}
                      >
                        Sign In / Sign Up
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Messages area */}
                    <div className="h-72 overflow-y-auto p-3 space-y-3">
                      {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center">
                          <div>
                            <MessageCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                              Hi! 👋 How can we help you today?
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              Send us a message and we'll reply shortly.
                            </p>
                          </div>
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                msg.sender_type === 'customer'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              <p className="text-sm break-words">{msg.message}</p>
                              <p className={`text-xs mt-1 ${
                                msg.sender_type === 'customer' 
                                  ? 'text-primary-foreground/70' 
                                  : 'text-muted-foreground'
                              }`}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-border/50">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          disabled={isSending}
                          className="flex-1 text-sm"
                        />
                        <Button 
                          type="submit" 
                          size="icon" 
                          disabled={!newMessage.trim() || isSending}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
