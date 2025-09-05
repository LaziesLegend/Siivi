import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot, User, Copy, ThumbsUp, ThumbsDown, Image, Mic, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ImageUpload } from './ImageUpload';
import { VoiceRecorder } from './VoiceRecorder';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

interface ChatInterfaceProps {
  conversationId: string;
  onConversationUpdate?: () => void;
}

export const ChatInterface = ({ conversationId, onConversationUpdate }: ChatInterfaceProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!user || !conversationId) return;
    
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || input.trim();
    if (!messageToSend || !user || !conversationId || loading) return;

    if (!customMessage) setInput('');
    setLoading(true);

    try {
      // Save user message
      const { data: userMessageData, error: userError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          content: messageToSend,
          role: 'user',
        })
        .select()
        .single();

      if (userError) throw userError;

      setMessages(prev => [...prev, userMessageData as Message]);

      // Get AI response with error handling and shorter token limit
      const conversationHistory = [...messages, userMessageData].map(msg => ({
        role: msg.role,
        content: msg.content.length > 800 ? msg.content.substring(0, 800) + '...' : msg.content,
      })).slice(-8); // Keep only last 8 messages for context

      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: conversationHistory,
          model: 'anthropic/claude-3.5-haiku', // More cost-effective model
          max_tokens: 500, // Further reduced token limit for lower cost
        },
      });

      if (aiError) throw aiError;

      const assistantContent = aiResponse.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      // Save AI response
      const { data: assistantMessageData, error: assistantError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          content: assistantContent,
          role: 'assistant',
        })
        .select()
        .single();

      if (assistantError) throw assistantError;

      setMessages(prev => [...prev, assistantMessageData as Message]);

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', user.id);

      onConversationUpdate?.();

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  if (loadingMessages) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to Siivi</h2>
              <p className="text-muted-foreground">
                Your intelligent AI assistant. How can I help you today?
              </p>
            </div>
          ) : (
            <div className="py-6 space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="group">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                      {message.role === 'user' ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {message.role === 'user' ? 'You' : 'Siivi'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed">
                        <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                      {message.role === 'assistant' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(message.content)}
                            className="h-7 px-2 text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="group">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">Siivi</span>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="border-t bg-background">
        <Collapsible open={showImageUpload} onOpenChange={setShowImageUpload}>
          <CollapsibleContent>
            <div className="p-4 border-b border-border">
              <ImageUpload onImageAnalyzed={(analysis) => sendMessage(`Analyze this image: ${analysis}`)} />
            </div>
          </CollapsibleContent>
          
          <div className="max-w-3xl mx-auto p-4">
            <div className="flex gap-2 mb-2">
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImageUpload(!showImageUpload)}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Image
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showImageUpload ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              
              <VoiceRecorder onTranscription={(text) => sendMessage(text)} />
            </div>
            
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message Siivi..."
                className="resize-none pr-12 border-input bg-background min-h-[48px] rounded-xl"
                rows={1}
                disabled={loading}
              />
              <Button 
                onClick={() => sendMessage()} 
                disabled={!input.trim() || loading}
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 rounded-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Collapsible>
      </div>
    </div>
  );
};