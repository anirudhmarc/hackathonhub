import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { Spinner } from '@/components/ui/spinner';
import { useNavigate } from 'react-router-dom';

const CallbackPage: React.FC = () => {
  const { isAuthenticated, isLoading, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-600">
        <p className="text-xl font-bold mb-4">Authentication Failed</p>
        <p>{error.message}</p>
      </div>
    );
  }

  return null; 
};

export default CallbackPage;