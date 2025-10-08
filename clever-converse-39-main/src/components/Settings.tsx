import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Save, User, Palette, Globe, MessageSquare, Brain, Zap, Shield, Download, Trash2, Loader2, LogOut } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import siiviLogo from '@/assets/siivi-logo-chatgpt-style.png';

interface Profile {
  id?: string;
  display_name?: string;
  font_size?: string;
  interaction_style?: string;
  language?: string;
}

export const Settings = () => {
  const { user, signOut } = useAuth();
  const { guestSession, clearGuestSession } = useGuestAuth();
  const { toast } = useToast();
  const { theme, themeColor, setTheme, setThemeColor } = useTheme();
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    font_size: 'medium',
    interaction_style: 'balanced',
    language: 'en',
  });
  
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user || guestSession) {
      fetchUserData();
    }
  }, [user, guestSession]);

  const fetchUserData = async () => {
    if (!user && !guestSession) return;
    
    setLoading(true);
    try {
      const userId = guestSession ? guestSession.id : user?.id;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile({
          id: profileData.id,
          display_name: profileData.display_name || (guestSession ? 'Guest User' : ''),
          font_size: profileData.font_size || 'medium',
          interaction_style: profileData.interaction_style || 'balanced',
          language: profileData.language || 'en',
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          font_size: profile.font_size,
          interaction_style: profile.interaction_style,
          language: profile.language,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  const exportData = async () => {
    if (!user && !guestSession) return;

    try {
      const userId = guestSession ? guestSession.id : user?.id;

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId);

      const { data: messages } = await supabase
        .from('messages')
        .select('*');

      const exportData = {
        conversations,
        messages,
        profile,
        account_type: guestSession ? 'guest' : 'registered',
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `siivi-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Your conversation data has been exported successfully",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: "Failed to export your data",
        variant: "destructive",
      });
    }
  };

  const deleteAllConversations = async () => {
    if (!user && !guestSession) return;

    try {
      const userId = guestSession ? guestSession.id : user?.id;

      await supabase.from('messages').delete().eq('conversation_id', userId);
      await supabase.from('conversations').delete().eq('user_id', userId);
      
      toast({
        title: "Conversations deleted",
        description: "All your conversations have been permanently deleted.",
      });
    } catch (error) {
      console.error('Error deleting conversations:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversations. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteAccount = async () => {
    if ((!user && !guestSession) || deleteConfirmText !== 'DELETE') return;

    try {
      if (guestSession) {
        await clearGuestSession();
        
        toast({
          title: "Session ended",
          description: "Your guest session and all data have been permanently deleted.",
        });
      } else if (user) {
        await supabase.from('conversations').delete().eq('user_id', user.id);
        await supabase.from('messages').delete().eq('conversation_id', user.id);
        await supabase.from('profiles').delete().eq('id', user.id);
        
        await signOut();
        
        toast({
          title: "Account deleted",
          description: "Your account and all data have been permanently deleted.",
        });
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 h-full overflow-auto">
      <div className="flex items-center gap-3 mb-6 fade-in">
        <img src={siiviLogo} alt="Siivi Logo" className="h-8 w-8 rounded-full" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Siivi Settings
          </h1>
          <p className="text-sm text-muted-foreground">Customize your AI assistant experience</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="scale-in hover:glow transition-all">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription className="text-sm">
              Customize your profile and appearance preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name" className="text-sm">Display Name</Label>
              <Input
                id="display-name"
                value={profile.display_name}
                onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="Enter your display name"
                className="text-sm rounded-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-size" className="text-sm">Font Size</Label>
              <Select
                value={profile.font_size}
                onValueChange={(value) => setProfile(prev => ({ ...prev, font_size: value }))}
              >
                <SelectTrigger className="text-sm rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interaction-style" className="text-sm">Interaction Style</Label>
              <Select
                value={profile.interaction_style}
                onValueChange={(value) => setProfile(prev => ({ ...prev, interaction_style: value }))}
              >
                <SelectTrigger className="text-sm rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="text-sm">Language</Label>
              <Select
                value={profile.language}
                onValueChange={(value) => setProfile(prev => ({ ...prev, language: value }))}
              >
                <SelectTrigger className="text-sm rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="scale-in hover:glow transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
              Theme Settings
            </CardTitle>
            <CardDescription className="text-sm">
              Customize the appearance and color scheme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-mode" className="text-sm">Theme Mode</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="text-sm rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme-color" className="text-sm">Color Theme</Label>
              <Select value={themeColor} onValueChange={setThemeColor}>
                <SelectTrigger className="text-sm rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="blue">Ocean Blue</SelectItem>
                  <SelectItem value="green">Nature Green</SelectItem>
                  <SelectItem value="purple">Royal Purple</SelectItem>
                  <SelectItem value="orange">Sunset Orange</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 scale-in hover:glow transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              Account & Privacy
            </CardTitle>
            <CardDescription className="text-sm">
              Manage your account and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button 
                onClick={async () => {
                  if (guestSession) {
                    await clearGuestSession();
                  } else {
                    await signOut();
                  }
                  toast({
                    title: "Signed out",
                    description: "You have been signed out successfully",
                  });
                }}
                variant="outline" 
                className="w-full rounded-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {guestSession ? 'End Guest Session' : 'Sign Out'}
              </Button>
              <Button 
                onClick={exportData}
                variant="outline" 
                className="w-full rounded-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export My Data
              </Button>
            </div>
            
            <Button 
              variant="destructive" 
              className="w-full rounded-full"
              onClick={() => {
                if (confirm('Are you sure you want to delete all your conversation history? This action cannot be undone.')) {
                  deleteAllConversations();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Conversations
            </Button>
            
            <Separator className="my-4" />
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full rounded-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and all associated data.
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="delete-confirm">Type "DELETE" to confirm:</Label>
                      <Input
                        id="delete-confirm"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="DELETE"
                        className="rounded-full"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmText('')} className="rounded-full">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAccount}
                    disabled={deleteConfirmText !== 'DELETE'}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto rounded-full">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};
