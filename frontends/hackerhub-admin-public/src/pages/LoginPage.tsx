import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import BrandLockup from '@/components/BrandLockup';

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, signinRedirect, activeNavigator } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && !activeNavigator) {
      navigate('/', { replace: true });
      return;
    }
  }, [isAuthenticated, isLoading, signinRedirect, activeNavigator, location.pathname, navigate]);

  if (isLoading || activeNavigator) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <p className="mt-4 text-lg">Loading authentication...</p>
      </div>
    );
  }

  const handleLoginClick = () => {
    signinRedirect();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <BrandLockup size="lg" className="justify-center mb-4" />
          <h1 className="text-2xl font-bold">AWS Hackathon</h1>
          <p className="text-gray-600">Admin System</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Sign in to manage participants, teams, and judging.
          </p>

          <Button
            onClick={handleLoginClick}
            variant="default"
            className="w-full py-6 text-lg shadow-sm"
          >
            Sign in with Cognito
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;