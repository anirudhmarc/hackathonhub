import React, { useEffect } from 'react';
import { useAuth as useAuthOidc } from 'react-oidc-context';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const Callback: React.FC = () => {
  const authOidc = useAuthOidc();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <p className="mt-4 text-lg">
          Completing authentication, please wait ...
        </p>
      </div>
    );
  }

  if (authOidc.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-600">
        <p className="text-xl font-bold mb-4">Authentication Failed</p>
        <p>{authOidc.error.message}</p>
        <Button onClick={() => navigate('/login')} className="mt-4">Try Login Again</Button>
      </div>
    );
  }

  return null;
};

export default Callback;