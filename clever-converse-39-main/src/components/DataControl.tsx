import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Trash2, 
  Shield, 
  AlertTriangle,
  FileText,
  Database,
  Calendar
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const DataControl = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const exportData = async (format: 'csv' | 'pdf' | 'json') => {
    if (!user) return;
    
    setExporting(true);
    try {
      // Fetch conversations first
      const { data: userConversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id);

      const conversationIds = userConversations?.map(c => c.id) || [];
      
      // Then fetch messages for those conversations
      const { data: userMessages } = conversationIds.length > 0
        ? await supabase
            .from('messages')
            .select('*')
            .in('conversation_id', conversationIds)
        : { data: [] };

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const userData = {
        conversations: userConversations || [],
        messages: userMessages || [],
        profile: userProfile,
        exportedAt: new Date().toISOString(),
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chatbot-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // Create CSV for messages (most important data)
        const csvContent = [
          ['Date', 'Conversation', 'Role', 'Content'].join(','),
          ...userData.messages.map(msg => [
            new Date(msg.created_at).toISOString(),
            msg.conversation_id,
            msg.role,
            `"${msg.content.replace(/"/g, '""')}"`,
          ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chatbot-messages-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description: `Data exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const clearChatHistory = async () => {
    if (!user) return;
    
    setClearing(true);
    try {
      // Get all user conversations first
      const { data: userConversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id);

      const conversationIds = userConversations?.map(c => c.id) || [];

      // Delete messages for these conversations
      if (conversationIds.length > 0) {
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds);

        if (messagesError) throw messagesError;
      }

      // Delete conversations
      const { error: conversationsError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id);

      if (conversationsError) throw conversationsError;

      toast({
        title: "Success",
        description: "Chat history cleared successfully",
      });
    } catch (error) {
      console.error('Error clearing chat history:', error);
      toast({
        title: "Error",
        description: "Failed to clear chat history",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    
    setDeleting(true);
    try {
      // Delete all user data (cascading deletes will handle related tables)
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) throw error;

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
      
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Data Control Center</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="transition-all hover:shadow-lg animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Your Data
            </CardTitle>
            <CardDescription>
              Download all your conversations, messages, and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => exportData('json')}
              disabled={exporting}
              className="w-full rounded-full transition-all hover:scale-105"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export as JSON
            </Button>
            <Button
              onClick={() => exportData('csv')}
              disabled={exporting}
              variant="outline"
              className="w-full rounded-full transition-all hover:scale-105"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export Messages as CSV
            </Button>
            <p className="text-xs text-muted-foreground">
              JSON format includes all data. CSV format includes messages only.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-lg animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Settings
            </CardTitle>
            <CardDescription>
              Manage your data and privacy preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium">Data Retention</h4>
              <p className="text-sm text-muted-foreground">
                Your conversations are stored securely and only you can access them.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Data Processing</h4>
              <p className="text-sm text-muted-foreground">
                Messages are processed by AI for responses but not stored by third parties.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-lg animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Clear Chat History
            </CardTitle>
            <CardDescription>
              Permanently delete all your conversations and messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={clearing} className="rounded-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {clearing ? 'Clearing...' : 'Clear All Chats'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your conversations and messages. 
                    This action cannot be undone. Consider exporting your data first.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearChatHistory}>
                    Clear History
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card className="border-destructive transition-all hover:shadow-lg animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting} className="rounded-full">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account and all associated data including:
                    <br />• All conversations and messages
                    <br />• Profile and preferences
                    <br />• Account settings
                    <br /><br />
                    This action cannot be undone. Please export your data first if you want to keep it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount} className="bg-destructive hover:bg-destructive/90">
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Email:</span>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <span className="font-medium">Account Created:</span>
              <p className="text-muted-foreground">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};