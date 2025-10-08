import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { DataDeletionWarning } from '@/components/DataDeletionWarning';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  const { user, loading } = useAuth();
  const { guestSession, loading: guestLoading } = useGuestAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !guestLoading && !user && !guestSession) {
      navigate('/auth');
    }
  }, [user, guestSession, loading, guestLoading, navigate]);

  if (loading || guestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !guestSession) {
    return null; // Will redirect to auth
  }

  return (
    <>
      <DataDeletionWarning />
      <Dashboard />
    </>
  );
};

export default Index;
