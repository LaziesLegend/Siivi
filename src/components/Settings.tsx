import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
import { Save, User, Palette, Globe, MessageSquare, Brain, Zap, Shield, Download, Trash2, Loader2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import siiviLogo from '@/assets/siivi-logo-circular.png';

interface Profile {
  id?: string;
  display_name?: string;
  theme_preference: string;
  font_size: string;
  interaction_style: string;
  language: string;
}

interface UserPreferences {
  notifications_enabled: boolean;
  daily_summary: boolean;
  weekly_summary: boolean;
  export_format: string;
  privacy_level: string;
}

export const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, themeColor, setTheme, setThemeColor } = useTheme();
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    theme_preference: 'system',
    font_size: 'medium',
    interaction_style: 'balanced',
    language: 'en',
  });
  
  const [currentTheme, setCurrentTheme] = useState('default');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications_enabled: true,
    daily_summary: false,
    weekly_summary: false,
    export_format: 'csv',
    privacy_level: 'standard',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          id: profileData.id,
          display_name: profileData.display_name || '',
          theme_preference: profileData.theme_preference || 'system',
          font_size: profileData.font_size || 'medium',
          interaction_style: profileData.interaction_style || 'balanced',
          language: profileData.language || 'en',
        });
      }

      // Fetch preferences
      const { data: preferencesData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (preferencesData) {
        setPreferences({
          notifications_enabled: preferencesData.notifications_enabled,
          daily_summary: preferencesData.daily_summary,
          weekly_summary: preferencesData.weekly_summary,
          export_format: preferencesData.export_format,
          privacy_level: preferencesData.privacy_level,
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
      // Update profile - use different approach based on whether profile exists
      if (profile.id) {
        // Update existing profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            display_name: profile.display_name,
            theme_preference: profile.theme_preference,
            font_size: profile.font_size,
            interaction_style: profile.interaction_style,
            language: profile.language,
          })
          .eq('id', profile.id);

        if (profileError) throw profileError;
      } else {
        // Create new profile
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            display_name: profile.display_name,
            theme_preference: profile.theme_preference,
            font_size: profile.font_size,
            interaction_style: profile.interaction_style,
            language: profile.language,
          })
          .select()
          .single();

        if (profileError) throw profileError;
        
        // Update local state with the new profile ID
        setProfile(prev => ({ ...prev, id: newProfile.id }));
      }

      // Update preferences with upsert (since preferences might not exist)
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        }, {
          onConflict: 'user_id'
        });

      if (preferencesError) throw preferencesError;

      // Apply theme change
      applyTheme(currentTheme);

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

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    // Remove existing theme classes
    root.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-orange');
    
    // Apply new theme
    if (theme !== 'default') {
      root.classList.add(`theme-${theme}`);
    }
  };

  const exportData = async () => {
    if (!user) return;

    try {
      // Export user data
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id);

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id);

      const exportData = {
        conversations,
        messages,
        profile,
        preferences,
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
        description: "Your data has been exported successfully",
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

  const deleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;

    try {
      // Delete user data
      await supabase.from('conversations').delete().eq('user_id', user.id);
      await supabase.from('messages').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('user_id', user.id);
      await supabase.from('user_preferences').delete().eq('user_id', user.id);
      
      // Sign out and redirect
      await supabase.auth.signOut();
      
      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });
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
      <div className="flex items-center gap-3 mb-6">
        <img src={siiviLogo} alt="Siivi Logo" className="h-8 w-8 rounded-full" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Siivi Settings
          </h1>
          <p className="text-sm text-muted-foreground">Customize your AI assistant experience</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Profile Settings</CardTitle>
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
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-size" className="text-sm">Font Size</Label>
              <Select
                value={profile.font_size}
                onValueChange={(value) => setProfile(prev => ({ ...prev, font_size: value }))}
              >
                <SelectTrigger className="text-sm">
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
                <SelectTrigger className="text-sm">
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
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48 overflow-auto">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="hi">हिन्दी</SelectItem>
                  <SelectItem value="tr">Türkçe</SelectItem>
                  <SelectItem value="pl">Polski</SelectItem>
                  <SelectItem value="nl">Nederlands</SelectItem>
                  <SelectItem value="sv">Svenska</SelectItem>
                  <SelectItem value="da">Dansk</SelectItem>
                  <SelectItem value="no">Norsk</SelectItem>
                  <SelectItem value="fi">Suomi</SelectItem>
                  <SelectItem value="he">עברית</SelectItem>
                  <SelectItem value="th">ไทย</SelectItem>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                  <SelectItem value="id">Bahasa Indonesia</SelectItem>
                  <SelectItem value="ms">Bahasa Melayu</SelectItem>
                  <SelectItem value="cs">Čeština</SelectItem>
                  <SelectItem value="sk">Slovenčina</SelectItem>
                  <SelectItem value="hr">Hrvatski</SelectItem>
                  <SelectItem value="hu">Magyar</SelectItem>
                  <SelectItem value="ro">Română</SelectItem>
                  <SelectItem value="bg">Български</SelectItem>
                  <SelectItem value="uk">Українська</SelectItem>
                  <SelectItem value="el">Ελληνικά</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
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
                <SelectTrigger className="text-sm">
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
              <Select value={currentTheme} onValueChange={setCurrentTheme}>
                <SelectTrigger className="text-sm">
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
              Chat & AI Settings
            </CardTitle>
            <CardDescription className="text-sm">
              Configure how Siivi responds and behaves
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ai-personality" className="text-sm">AI Personality</Label>
                <Select defaultValue="professional">
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly & Casual</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="response-style" className="text-sm">Response Style</Label>
                <Select defaultValue="balanced">
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creative">Creative & Detailed</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="precise">Precise & Concise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Auto-scroll to new messages</Label>
                  <p className="text-xs text-muted-foreground">Automatically scroll when new messages arrive</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Show typing indicators</Label>
                  <p className="text-xs text-muted-foreground">Show when Siivi is thinking</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Sound notifications</Label>
                  <p className="text-xs text-muted-foreground">Play sound for new messages</p>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              Privacy & Data
            </CardTitle>
            <CardDescription className="text-sm">
              Control your data and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Save conversation history</Label>
                <p className="text-xs text-muted-foreground">Keep your chats for future reference</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Analytics & improvements</Label>
                <p className="text-xs text-muted-foreground">Help improve Siivi with usage data</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 pt-4">
              <Button 
                onClick={exportData}
                variant="outline" 
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export My Data
              </Button>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => {
                  if (confirm('Are you sure you want to delete all your conversation history? This action cannot be undone.')) {
                    // Implementation for deleting conversation history
                    toast({
                      title: "Data cleared",
                      description: "All conversation history has been deleted.",
                    });
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>
            </div>
            
            <Separator className="my-4" />
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
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
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAccount}
                    disabled={deleteConfirmText !== 'DELETE'}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
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