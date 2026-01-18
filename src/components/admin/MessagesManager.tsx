import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { 
  MessageSquare, User, Send, Bell, ChevronRight, Bot, 
  UserCircle, Loader2, AlertTriangle, Edit2, Check, X 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

interface ChatMessage {
  id: string;
  user_id: string | null;
  sender_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  is_ai_generated?: boolean;
  is_edited?: boolean;
  edited_at?: string;
  edited_by?: string;
  original_message?: string;
  requires_human_review?: boolean;
  confidence_score?: number;
}

interface Conversation {
  user_id: string;
  messages: ChatMessage[];
  lastMessage: ChatMessage;
  unreadCount: number;
  userName?: string;
  needsAttention: boolean;
}

const MessagesManager = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Fetch user profiles
    const userIds = [...new Set(messages?.filter(m => m.user_id).map(m => m.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);

    // Group messages by user
    const conversationMap = new Map<string, ChatMessage[]>();
    
    messages?.forEach(msg => {
      if (msg.user_id) {
        const existing = conversationMap.get(msg.user_id) || [];
        existing.push(msg);
        conversationMap.set(msg.user_id, existing);
      }
    });

    // Convert to conversation objects
    const convos: Conversation[] = [];
    conversationMap.forEach((msgs, userId) => {
      const lastMessage = msgs[msgs.length - 1];
      const unreadCount = msgs.filter(m => m.sender_type === 'customer' && !m.is_read).length;
      const profile = profiles?.find(p => p.user_id === userId);
      
      // Check if any message needs human attention
      const needsAttention = msgs.some(m => 
        m.requires_human_review && 
        m.sender_type === 'admin' && 
        m.is_ai_generated
      );
      
      convos.push({
        user_id: userId,
        messages: msgs,
        lastMessage,
        unreadCount,
        userName: profile?.full_name || 'Customer',
        needsAttention,
      });
    });

    // Sort: needs attention first, then by last message date
    convos.sort((a, b) => {
      if (a.needsAttention && !b.needsAttention) return -1;
      if (!a.needsAttention && b.needsAttention) return 1;
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
    });

    setConversations(convos);
    setIsLoading(false);
  }, [toast]);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .eq('key', 'ai_auto_reply_enabled')
        .maybeSingle();
      
      if (data) {
        setAutoReplyEnabled(data.value !== 'false');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin-chat-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as ChatMessage;
          
          if (newMsg.sender_type === 'customer') {
            sonnerToast.info('New Message!', {
              description: newMsg.message.substring(0, 50) + (newMsg.message.length > 50 ? '...' : ''),
              icon: <Bell className="w-4 h-4" />,
              duration: 8000,
            });
          }

          // Alert if human review needed
          if (newMsg.requires_human_review && newMsg.is_ai_generated) {
            sonnerToast.warning('Human Review Requested!', {
              description: 'A customer needs human assistance.',
              icon: <AlertTriangle className="w-4 h-4" />,
              duration: 10000,
            });
          }
        }

        // Refresh messages
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  const toggleAutoReply = async (enabled: boolean) => {
    setAutoReplyEnabled(enabled);
    
    const { error } = await supabase
      .from('site_settings')
      .upsert({ 
        key: 'ai_auto_reply_enabled', 
        value: enabled ? 'true' : 'false',
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update setting',
        variant: 'destructive',
      });
      setAutoReplyEnabled(!enabled);
    } else {
      toast({
        title: enabled ? 'AI Auto-Reply Enabled' : 'AI Auto-Reply Disabled',
        description: enabled 
          ? 'AI will automatically respond to customer messages'
          : 'You will need to respond manually to all messages',
      });
    }
  };

  const markAsRead = async (userId: string) => {
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('sender_type', 'customer')
      .eq('is_read', false);

    setConversations(prev => 
      prev.map(c => c.user_id === userId ? { ...c, unreadCount: 0 } : c)
    );
  };

  const handleSelectConversation = (userId: string) => {
    setSelectedConversation(userId);
    markAsRead(userId);
    setEditingMessageId(null);
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedConversation) return;

    setIsSending(true);

    const { error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: selectedConversation,
        sender_type: 'admin',
        message: replyMessage.trim(),
        is_read: false,
        is_ai_generated: false,
      }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    } else {
      setReplyMessage('');
      toast({
        title: 'Sent',
        description: 'Reply sent successfully',
      });
    }

    setIsSending(false);
  };

  const startEditMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditedContent(msg.message);
  };

  const saveEditedMessage = async () => {
    if (!editingMessageId || !editedContent.trim()) return;

    const originalMsg = selectedConvo?.messages.find(m => m.id === editingMessageId);
    
    const { error } = await supabase
      .from('chat_messages')
      .update({
        message: editedContent.trim(),
        is_edited: true,
        edited_at: new Date().toISOString(),
        original_message: originalMsg?.original_message || originalMsg?.message,
      })
      .eq('id', editingMessageId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to edit message',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Message Updated',
        description: 'The message has been edited',
      });
      setEditingMessageId(null);
      setEditedContent('');
    }
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditedContent('');
  };

  const clearHumanReviewFlag = async (messageId: string) => {
    await supabase
      .from('chat_messages')
      .update({ is_read: true } as any) // Using is_read as workaround, flag cleared in local state
      .eq('id', messageId);
    
    // Update local state to clear the flag
    setConversations(prev => prev.map(c => ({
      ...c,
      messages: c.messages.map(m => 
        m.id === messageId ? { ...m, requires_human_review: false } : m
      ),
      needsAttention: c.messages.filter(m => m.id !== messageId).some(m => 
        m.requires_human_review && m.sender_type === 'admin' && m.is_ai_generated
      )
    })));
  };

  const selectedConvo = conversations.find(c => c.user_id === selectedConversation);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const attentionCount = conversations.filter(c => c.needsAttention).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      {/* Conversations List */}
      <Card className="glass-card lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversations ({conversations.length})
            {attentionCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {attentionCount} need attention
              </Badge>
            )}
          </CardTitle>
          
          {/* AI Auto-Reply Toggle */}
          <div className="flex items-center justify-between mt-3 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              {autoReplyEnabled ? (
                <Bot className="w-4 h-4 text-green-500" />
              ) : (
                <UserCircle className="w-4 h-4 text-muted-foreground" />
              )}
              <Label htmlFor="auto-reply" className="text-sm font-medium">
                AI Auto-Reply
              </Label>
            </div>
            <Switch
              id="auto-reply"
              checked={autoReplyEnabled}
              onCheckedChange={toggleAutoReply}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {autoReplyEnabled 
              ? 'AI responds automatically to customers' 
              : 'Manual responses only'}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[480px]">
            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {conversations.map(convo => (
                  <button
                    key={convo.user_id}
                    onClick={() => handleSelectConversation(convo.user_id)}
                    className={`w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                      selectedConversation === convo.user_id ? 'bg-muted/70' : ''
                    } ${convo.needsAttention ? 'bg-yellow-500/10' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      convo.needsAttention ? 'bg-yellow-500/20' : 'bg-primary/20'
                    }`}>
                      {convo.needsAttention ? (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">
                          {convo.userName}
                        </span>
                        <div className="flex items-center gap-1">
                          {convo.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {convo.unreadCount}
                            </Badge>
                          )}
                          {convo.needsAttention && (
                            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500">
                              Review
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {convo.lastMessage.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {format(new Date(convo.lastMessage.created_at), 'PP')}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat View */}
      <Card className="glass-card lg:col-span-2">
        {selectedConvo ? (
          <>
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {selectedConvo.userName}
                </div>
                {selectedConvo.needsAttention && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Needs Human Review
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-[520px]">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {selectedConvo.messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div className={`max-w-[75%] ${msg.requires_human_review ? 'ring-2 ring-yellow-500/50 rounded-lg' : ''}`}>
                        {/* Message header for admin messages */}
                        {msg.sender_type === 'admin' && (
                          <div className="flex items-center justify-end gap-1 mb-1">
                            {msg.is_ai_generated ? (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Bot className="w-3 h-3" />
                                AI
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs gap-1">
                                <UserCircle className="w-3 h-3" />
                                Admin
                              </Badge>
                            )}
                            {msg.is_edited && (
                              <Badge variant="outline" className="text-xs">
                                Edited
                              </Badge>
                            )}
                            {msg.requires_human_review && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-xs text-yellow-600"
                                onClick={() => clearHumanReviewFlag(msg.id)}
                              >
                                Clear flag
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {editingMessageId === msg.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              className="min-h-[80px]"
                            />
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                <X className="w-4 h-4" />
                              </Button>
                              <Button size="sm" onClick={saveEditedMessage}>
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`rounded-lg px-3 py-2 group relative ${
                              msg.sender_type === 'admin'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                            <div className={`flex items-center justify-between mt-1 ${
                              msg.sender_type === 'admin' 
                                ? 'text-primary-foreground/70' 
                                : 'text-muted-foreground'
                            }`}>
                              <p className="text-xs">
                                {format(new Date(msg.created_at), 'PPp')}
                              </p>
                              {msg.sender_type === 'admin' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => startEditMessage(msg)}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Reply Input */}
              <div className="p-3 border-t border-border/50">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                  <Button 
                    onClick={sendReply} 
                    disabled={!replyMessage.trim() || isSending}
                    className="self-end"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Press Enter to send • Shift+Enter for new line
                </p>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="h-full flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">Select a conversation to view messages</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default MessagesManager;
