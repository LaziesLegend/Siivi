import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const DataDeletionWarning = () => {
  const { user } = useAuth();
  const { guestSession } = useGuestAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [shouldShowWarning, setShouldShowWarning] = useState(false);

  useEffect(() => {
    if (guestSession) {
      // Show warning for guest users about their temporary session
      setShouldShowWarning(true);
    }
  }, [guestSession]);

  const exportData = async () => {
    if (!user && !guestSession) return;
    
    setLoading(true);
    try {
      const userId = guestSession ? guestSession.id : user?.id;

      // Export user data
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId);

      const { data: messages } = await supabase
        .from('messages')
        .select('*');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const exportData = {
        conversations,
        messages,
        profile,
        exported_at: new Date().toISOString(),
        account_type: guestSession ? 'guest' : 'registered'
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
    } finally {
      setLoading(false);
    }
  };

  if (!shouldShowWarning) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 mb-4">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-orange-800 dark:text-orange-200">
          You're using a guest session. Your data will be deleted when the session expires.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={exportData}
          disabled={loading}
          className="border-orange-300 text-orange-700 hover:bg-orange-100 rounded-full"
        >
          <Download className="h-3 w-3 mr-1" />
          {loading ? 'Exporting...' : 'Download Data'}
        </Button>
      </AlertDescription>
    </Alert>
  );
};
