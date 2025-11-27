import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

const AuthRedirect: React.FC = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    const hasAuthCode = new URLSearchParams(location.search).has('code');
    const authProcessed = sessionStorage.getItem('auth_processed') === 'true';

    if (isLoading) {
      return;
    }

    if (isAuthenticated) {
      const redirectPath = sessionStorage.getItem('redirectPath');
      if (redirectPath) {
        sessionStorage.removeItem('redirectPath');
        navigate(redirectPath);
      } else {
        navigate('/teams');
      }
    } else if (!redirectAttempted && (hasAuthCode || authProcessed)) {
      setRedirectAttempted(true);
    }
  }, [isAuthenticated, isLoading, navigate, location.search, redirectAttempted]);

  const handleLogin = () => {
    sessionStorage.setItem('redirectPath', location.pathname);
    sessionStorage.removeItem('auth_processed');
    login();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <p className="mt-4 text-lg">Checking authentication status...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center mb-8">
            <img src="/aws-logo.png" alt="AWS Logo" className="h-16 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Malaysia Great AI Hackathon</h1>
            <p className="text-gray-600">Judging System</p>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-md text-blue-800 text-sm">
              <p>Please sign in to access the hackathon judging system.</p>
            </div>

            <Button
              onClick={handleLogin}
              className="w-full py-6 text-lg"
            >
              Sign in with Cognito
            </Button>

            {redirectAttempted && (
              <div className="bg-yellow-50 p-4 rounded-md text-yellow-800 text-sm mt-4">
                <p className="font-medium">Authentication issue detected</p>
                <p className="mt-1">There was a problem with your sign-in. Please try again.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Spinner size="lg" />
      <p className="mt-4 text-lg">Redirecting...</p>
    </div>
  );
};

export default AuthRedirect;
