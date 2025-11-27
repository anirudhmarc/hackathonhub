import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

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
          <img 
            src="/aws-logo.png" 
            alt="AWS Logo" 
            className="h-16 w-auto mx-auto mb-4"
            onError={(e) => {
              // Fallback to SVG if PNG fails to load
              const target = e.target as HTMLImageElement;
              target.src = "/aws-logo.svg";
              target.onerror = () => {
                // If both fail, hide the image
                target.style.display = 'none';
              };
            }}
          />
          <h1 className="text-2xl font-bold">Great Malaysia AI Hackathon</h1>
          <p className="text-gray-600">Admin System</p>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-md text-blue-800 text-sm text-center">
            <p>Please sign in to access the hackathon admin system.</p>
          </div>

          <Button 
            onClick={handleLoginClick} 
            variant="default"
            className="w-full py-6 text-lg shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Sign in with Cognito
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;