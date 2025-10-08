import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/Sidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { Settings } from '@/components/Settings';
import { DataControl } from '@/components/DataControl';
import { DonationPage } from '@/pages/DonationPage';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Settings as SettingsIcon, Database, Plus, Menu } from 'lucide-react';
import siiviLogo from '@/assets/siivi-logo-chatgpt-style.png';
import { useIsMobile } from '@/hooks/use-mobile';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { guestSession } = useGuestAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'settings' | 'data'>('chat');
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDonationPage, setShowDonationPage] = useState(false);

  useEffect(() => {
    if (user || guestSession) {
      fetchConversations();
    } else {
      setLoading(false);
    }
  }, [user, guestSession]);

  const fetchConversations = async () => {
    const userId = guestSession ? guestSession.id : user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = async () => {
    const userId = guestSession ? guestSession.id : user?.id;
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: `New Chat ${conversations.length + 1}`,
        })
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => [data, ...prev]);
      setActiveConversation(data.id);
      setActiveView('chat');
      
      toast({
        title: "Success",
        description: "New conversation created",
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create new conversation",
        variant: "destructive",
      });
    }
  };

  const deleteConversation = async (id: string) => {
    const userId = guestSession ? guestSession.id : user?.id;
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== id));
      
      if (activeConversation === id) {
        setActiveConversation(null);
      }

      toast({
        title: "Success",
        description: "Conversation deleted",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showDonationPage ? (
        <div className="fixed inset-0 z-50 bg-background">
          <Button
            variant="ghost"
            onClick={() => setShowDonationPage(false)}
            className="fixed top-4 left-4 z-50"
          >
            ← Back to Dashboard
          </Button>
          <DonationPage />
        </div>
      ) : (
        <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Layout */}
      {isMobile ? (
        <>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <div className="flex flex-col h-full w-full">
              <header className="border-b border-border p-4 gradient-bg flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 fade-in">
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" className="hover:bg-accent/50">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <img src={siiviLogo} alt="Siivi" className="h-6 w-6 rounded-full" />
                    <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Siivi
                    </h1>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant={activeView === 'chat' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('chat')}
                      className="px-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={activeView === 'settings' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('settings')}
                      className="px-2"
                    >
                      <SettingsIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={activeView === 'data' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('data')}
                      className="px-2"
                    >
                      <Database className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </header>

              <main className="flex-1 overflow-auto">
                {activeView === 'chat' && (
                  <div className="h-full fade-in">
                    {activeConversation ? (
                      <ChatInterface 
                        conversationId={activeConversation}
                        onConversationUpdate={fetchConversations}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full p-4">
                        <div className="text-center max-w-md">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                            <MessageSquare className="h-8 w-8 text-primary" />
                          </div>
                          <h2 className="text-2xl font-semibold mb-3">Welcome to Siivi</h2>
                          <p className="text-muted-foreground mb-6">
                            Your intelligent AI assistant. How can I help you today?
                          </p>
                          <Button 
                            onClick={createNewConversation} 
                            size="lg" 
                            className="hover:scale-105 transition-transform rounded-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            New chat
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeView === 'settings' && (
                  <div className="fade-in h-full overflow-auto">
                    <Settings />
                  </div>
                )}
                {activeView === 'data' && (
                  <div className="fade-in h-full overflow-auto">
                    <DataControl />
                  </div>
                )}
              </main>
            </div>
            
            <SheetContent side="left" className="p-0 w-80">
              <Sidebar
                conversations={conversations}
                activeConversation={activeConversation}
                onSelectConversation={(id) => {
                  setActiveConversation(id);
                  setMobileMenuOpen(false);
                }}
                onDeleteConversation={deleteConversation}
                onNewConversation={() => {
                  createNewConversation();
                  setMobileMenuOpen(false);
                }}
                onSettingsClick={() => {
                  setActiveView('settings');
                  setMobileMenuOpen(false);
                }}
                onDonationClick={() => {
                  setShowDonationPage(true);
                  setMobileMenuOpen(false);
                }}
                collapsed={false}
              />
            </SheetContent>
          </Sheet>
        </>
      ) : (
        /* Desktop Layout */
        <ResizablePanelGroup direction="horizontal" className="min-h-screen">
          <ResizablePanel
            defaultSize={sidebarCollapsed ? 5 : 20}
            minSize={5}
            maxSize={40}
            className="transition-all duration-300"
          >
            <Sidebar
              conversations={conversations}
              activeConversation={activeConversation}
              onSelectConversation={setActiveConversation}
              onDeleteConversation={deleteConversation}
              onNewConversation={createNewConversation}
              onSettingsClick={() => setActiveView('settings')}
              onDonationClick={() => setShowDonationPage(true)}
              collapsed={sidebarCollapsed}
              onCollapse={setSidebarCollapsed}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle className="bg-border hover:bg-accent transition-colors" />
          
          <ResizablePanel defaultSize={sidebarCollapsed ? 95 : 80} className="flex flex-col">
            <header className="border-b border-border p-4 gradient-bg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 fade-in">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hover:bg-accent/50"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <img src={siiviLogo} alt="Siivi" className="h-8 w-8 rounded-full" />
                  <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                      Siivi
                    </h1>
                    <p className="text-xs text-muted-foreground">Your AI Assistant</p>
                  </div>
                </div>
                <div className="flex gap-2 slide-in-right">
                  <Button
                    variant={activeView === 'chat' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('chat')}
                    className="transition-all hover:scale-105"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                  <Button
                    variant={activeView === 'settings' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('settings')}
                    className="transition-all hover:scale-105"
                  >
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button
                    variant={activeView === 'data' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('data')}
                    className="transition-all hover:scale-105"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Data Control
                  </Button>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-auto">
              {activeView === 'chat' && (
                <div className="h-full fade-in">
                  {activeConversation ? (
                    <ChatInterface 
                      conversationId={activeConversation}
                      onConversationUpdate={fetchConversations}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center max-w-md mx-4">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                          <MessageSquare className="h-10 w-10 text-primary" />
                        </div>
                        <h2 className="text-3xl font-semibold mb-4">Welcome to Siivi</h2>
                        <p className="text-muted-foreground mb-8 text-lg">
                          Your intelligent AI assistant. How can I help you today?
                        </p>
                        <Button 
                          onClick={createNewConversation} 
                          size="lg" 
                          className="hover:scale-105 transition-transform rounded-full px-8 py-3"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          New chat
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {activeView === 'settings' && (
                <div className="fade-in h-full">
                  <Settings />
                </div>
              )}
              {activeView === 'data' && (
                <div className="fade-in h-full">
                  <DataControl />
                </div>
              )}
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
      )}
    </>
  );
};

export default Dashboard;