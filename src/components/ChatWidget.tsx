import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, X, Send, Minimize2, Bot, User } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  user_id: string | null;
  sender_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  is_ai_generated?: boolean;
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const lastAiRequestRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  const fetchMessages = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      const unreadAdminMessages = data.filter(
        m => (m.sender_type === 'admin' || m.sender_type === 'ai') && !m.is_read
      );
      setHasUnread(unreadAdminMessages.length > 0);
    }
  }, [user]);

  // Request AI response
  const requestAiResponse = useCallback(async (customerMessage: string) => {
    if (!user) return;

    // Rate limit: minimum 2 seconds between AI requests
    const now = Date.now();
    if (now - lastAiRequestRef.current < 2000) {
      return;
    }
    lastAiRequestRef.current = now;

    setIsAiTyping(true);

    try {
      // Get recent conversation history
      const conversationHistory = messages.slice(-10).map(m => ({
        sender_type: m.sender_type,
        message: m.message
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-chat-reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            message: customerMessage,
            userId: user.id,
            conversationHistory
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast({
            title: 'Please slow down',
            description: errorData.error || 'You\'re sending messages too quickly.',
            variant: 'destructive',
          });
          return;
        }
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      if (data.reply) {
        // Insert AI response into database (using type assertion for new columns)
        const { error: insertError } = await supabase
          .from('chat_messages')
          .insert([{
            user_id: user.id,
            sender_type: 'admin',
            message: data.reply,
            is_read: false,
          } as any]);

        if (insertError) {
          console.error('Error saving AI response:', insertError);
        }
      }
    } catch (error) {
      console.error('AI response error:', error);
      // Don't show error toast for AI failures - just let it fail silently
      // Admin can still respond manually
    } finally {
      setIsAiTyping(false);
    }
  }, [user, messages, toast]);

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
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          // Show unread indicator if admin/AI message and widget is closed
          if ((newMsg.sender_type === 'admin' || newMsg.sender_type === 'ai') && !isOpen) {
            setHasUnread(true);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isOpen, fetchMessages]);

  // Mark messages as read when opening chat
  const markMessagesAsRead = async () => {
    if (!user) return;

    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .in('sender_type', ['admin', 'ai'])
      .eq('is_read', false);

    setHasUnread(false);
  };

  const handleOpenChat = async () => {
    setIsOpen(true);
    setIsMinimized(false);
    await markMessagesAsRead();

    // If this is the first open and no messages, trigger a welcome
    if (user && messages.length === 0) {
      // Small delay for better UX
      setTimeout(() => {
        requestAiResponse("Hello, I just opened the chat");
      }, 500);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending) return;

    const messageText = newMessage.trim();
    setIsSending(true);
    setNewMessage('');

    // Insert customer message
    const { error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: user.id,
        sender_type: 'customer',
        message: messageText,
        is_read: false,
      }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      setNewMessage(messageText);
    } else {
      // Request AI response after customer message
      requestAiResponse(messageText);
    }

    setIsSending(false);
  };

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
                  <span className="text-xs font-normal text-muted-foreground">• AI Assisted</span>
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
                        Create an account or log in to start a conversation with our AI assistant.
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
                    {messages.length === 0 && !isAiTyping ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-2">
                          <Bot className="w-10 h-10 mx-auto mb-2 text-primary/50" />
                          <p className="text-sm text-muted-foreground mb-3">
                            Hi! 👋 How can I help you?
                          </p>
                          <div className="grid grid-cols-2 gap-2 w-full">
                            {[
                              { label: '📍 Store Location', msg: 'Where are you located?' },
                              { label: '🚚 Delivery Charges', msg: 'What are your delivery charges?' },
                              { label: '💰 Wholesale Prices', msg: 'What are your wholesale prices?' },
                              { label: '📦 Product Availability', msg: 'How can I check product availability?' },
                            ].map((qr) => (
                              <button
                                key={qr.label}
                                type="button"
                                onClick={() => {
                                  setNewMessage(qr.msg);
                                  // Auto-send after a tick
                                  setTimeout(() => {
                                    const form = document.getElementById('chat-form') as HTMLFormElement;
                                    form?.requestSubmit();
                                  }, 50);
                                }}
                                className="text-xs px-2 py-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-foreground transition-colors text-left"
                              >
                                {qr.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${
                                msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div className="flex items-end gap-1.5 max-w-[85%]">
                                {msg.sender_type !== 'customer' && (
                                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mb-5">
                                    {msg.is_ai_generated ? (
                                      <Bot className="w-3 h-3 text-primary" />
                                    ) : (
                                      <User className="w-3 h-3 text-primary" />
                                    )}
                                  </div>
                                )}
                                <div
                                  className={`rounded-lg px-3 py-2 ${
                                    msg.sender_type === 'customer'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-foreground'
                                  }`}
                                >
                                  <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                                  <p className={`text-xs mt-1 ${
                                    msg.sender_type === 'customer' 
                                      ? 'text-primary-foreground/70' 
                                      : 'text-muted-foreground'
                                  }`}>
                                    {format(new Date(msg.created_at), 'HH:mm')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Typing indicator */}
                          {isAiTyping && (
                            <div className="flex justify-start">
                              <div className="flex items-end gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mb-1">
                                  <Bot className="w-3 h-3 text-primary" />
                                </div>
                                <div className="bg-muted rounded-lg px-4 py-3">
                                  <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
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
                          disabled={isSending || isAiTyping}
                          className="flex-1 text-sm"
                          maxLength={1000}
                        />
                        <Button 
                          type="submit" 
                          size="icon" 
                          disabled={!newMessage.trim() || isSending || isAiTyping}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 text-center">
                        💕 Powered by AI • Human support available
                      </p>
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
