import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useMessageCounter } from '@/hooks/useMessageCounter';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Bot, User, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { VoiceRecorder } from './VoiceRecorder';
import { DonationDialog } from './DonationDialog';
import { IntegratedChatInput } from './chat/IntegratedChatInput';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from './ThemeProvider';

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
  const { guestSession } = useGuestAuth();
  const { toast } = useToast();
  const { showDonation, incrementCounter, hideDonation } = useMessageCounter();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [personality, setPersonality] = useState('casual');

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
    const userId = guestSession ? guestSession.id : user?.id;
    if (!userId || !conversationId) return;
    
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
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
    const userId = guestSession ? guestSession.id : user?.id;
    if (!messageToSend || !userId || !conversationId || loading) return;

    if (!customMessage) setInput('');
    setLoading(true);

    try {
      // Save user message
      const { data: userMessageData, error: userError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: messageToSend,
          role: 'user',
        })
        .select()
        .single();

      if (userError) throw userError;

      setMessages(prev => [...prev, userMessageData as Message]);

      // Get AI response with full capabilities
      const conversationHistory = [...messages, userMessageData].map(msg => ({
        role: msg.role,
        content: msg.content,
      })).slice(-10); // Keep last 10 messages for context

      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: conversationHistory,
          type: 'text',
          personality,
        },
      });

      if (aiError) throw aiError;

      const assistantContent = aiResponse.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      // Save AI response
      const { data: assistantMessageData, error: assistantError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
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

      // Increment message counter for donation tracking
      incrementCounter();

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

  const generateImage = async () => {
    const prompt = input.trim();
    if (!prompt || generatingImage) return;

    setGeneratingImage(true);
    setInput('');

    try {
      const userId = guestSession ? guestSession.id : user?.id;
      if (!userId || !conversationId) return;

      // Save user message
      const { data: userMessageData, error: userError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: `Generate image: ${prompt}`,
          role: 'user',
        })
        .select()
        .single();

      if (userError) throw userError;
      setMessages(prev => [...prev, userMessageData as Message]);

      // Generate image
      const { data: imageResponse, error: imageError } = await supabase.functions.invoke('ai-chat', {
        body: {
          type: 'image',
          prompt: prompt,
        },
      });

      if (imageError) throw imageError;

      const assistantContent = imageResponse.imageUrl 
        ? `![Generated Image](${imageResponse.imageUrl})\n\n${imageResponse.message || ''}`
        : 'Sorry, I could not generate the image.';

      // Save AI response with image
      const { data: assistantMessageData, error: assistantError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: assistantContent,
          role: 'assistant',
        })
        .select()
        .single();

      if (assistantError) throw assistantError;
      setMessages(prev => [...prev, assistantMessageData as Message]);

      incrementCounter();
      onConversationUpdate?.();

    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCommandSelect = (command: string) => {
    console.log('Command selected:', command);
    // Commands are processed by AI in the edge function
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
      <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-bounce">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2 fade-in">Welcome to Siivi</h2>
              <p className="text-muted-foreground fade-in" style={{ animationDelay: '0.1s' }}>
                Your intelligent AI assistant. How can I help you today?
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div 
                  key={message.id} 
                  className="group animate-fade-in" 
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
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
                       <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted">
                        <ReactMarkdown
                          components={{
                            code({ className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeString = String(children).replace(/\n$/, '');
                              const isInline = !match;
                              
                              return !isInline ? (
                                <div className="relative group my-4">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(codeString);
                                      toast({
                                        title: "Copied",
                                        description: "Code copied to clipboard",
                                      });
                                    }}
                                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground px-2 py-1 rounded text-xs z-10"
                                  >
                                    Copy
                                  </button>
                                  <SyntaxHighlighter
                                    style={(theme === 'dark' ? vscDarkPlus : vs) as any}
                                    language={match ? match[1] : 'text'}
                                    PreTag="div"
                                    {...props}
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              ) : (
                                <code className="bg-muted px-1 py-0.5 rounded text-primary" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            img({ src, alt }: any) {
                              return (
                                <img 
                                  src={src} 
                                  alt={alt || ''} 
                                  className="rounded-lg max-w-full h-auto my-2"
                                />
                              );
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      {message.role === 'assistant' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(message.content)}
                            className="h-7 px-2 text-xs transition-all hover:scale-110 rounded-full"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs transition-all hover:scale-110 rounded-full">
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs transition-all hover:scale-110 rounded-full">
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="group animate-fade-in">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 animate-pulse">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">Siivi</span>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="border-t bg-background flex-shrink-0">
        <Collapsible open={showImageUpload} onOpenChange={setShowImageUpload}>
          <CollapsibleContent>
            <div className="p-4 border-b border-border animate-fade-in">
              <ImageUpload onImageAnalyzed={(analysis) => sendMessage(`Analyze this image: ${analysis}`)} />
            </div>
          </CollapsibleContent>
          
          <div className="max-w-3xl mx-auto p-4">
            <IntegratedChatInput
              value={input}
              onChange={setInput}
              onSend={() => sendMessage()}
              onImageAnalyze={() => setShowImageUpload(!showImageUpload)}
              onImageGenerate={generateImage}
              onVoiceRecord={(text) => sendMessage(text)}
              onCommandSelect={handleCommandSelect}
              loading={loading}
              disabled={loading || generatingImage}
            />
          </div>
        </Collapsible>
      </div>

      <DonationDialog isOpen={showDonation} onClose={hideDonation} />
    </div>
  );
};