import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  LogOut, 
  Plus, 
  Search, 
  MessageSquare, 
  Trash2,
  User,
  Moon,
  Sun,
  Laptop,
  Heart,
  Settings
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversation: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
  onSettingsClick: () => void;
  onDonationClick: () => void;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export const Sidebar = ({
  conversations,
  activeConversation,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
  onSettingsClick,
  onDonationClick,
  collapsed = false,
  onCollapse
}: SidebarProps) => {
  const { user, signOut } = useAuth();
  const { guestSession, clearGuestSession } = useGuestAuth();
  const { theme, setTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');

  const displayName = guestSession 
    ? 'Guest User' 
    : (user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User');

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSignOut = async () => {
    if (guestSession) {
      await clearGuestSession();
    } else {
      await signOut();
    }
  };

  return (
    <div className={`border-r border-border bg-card flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-80'
    }`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <span className="font-medium truncate">
                {displayName}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {theme === 'light' ? (
                      <Sun className="h-4 w-4" />
                    ) : theme === 'dark' ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Laptop className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Laptop className="h-4 w-4 mr-2" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <Button 
          onClick={onNewConversation} 
          className={`mb-4 transition-all hover:scale-105 rounded-full ${collapsed ? 'w-auto px-2' : 'w-full'}`}
          size={collapsed ? "sm" : "default"}
          variant="default"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span className="ml-2">New chat</span>}
        </Button>
        
        {!collapsed && (
          <div className="flex gap-2 mb-4">
            <Button
              onClick={onSettingsClick}
              variant="outline"
              size="sm"
              className="flex-1 rounded-full"
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
            <Button
              onClick={onDonationClick}
              variant="outline"
              size="sm"
              className="flex-1 rounded-full border-pink-500 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950"
            >
              <Heart className="h-4 w-4 mr-1" />
              Donate
            </Button>
          </div>
        )}
        
        {!collapsed && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {collapsed ? (
                <MessageSquare className="h-6 w-6 mx-auto opacity-50" />
              ) : (
                searchTerm ? 'No conversations found' : 'No conversations yet'
              )}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-accent mb-1 transition-all hover:scale-[1.02] ${
                  activeConversation === conversation.id ? 'bg-accent glow' : ''
                }`}
                onClick={() => onSelectConversation(conversation.id)}
                title={collapsed ? conversation.title : ''}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conversation.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conversation.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conversation.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};