import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

const StudentHackhubAuthRedirect: React.FC = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuthIssueMessage, setShowAuthIssueMessage] = useState(false);

  useEffect(() => {
  console.log("StudentHackhubAuthRedirect useEffect:", { isAuthenticated, isLoading, pathname: location.pathname, search: location.search });

    if (isAuthenticated && !isLoading) {
      console.log('StudentHackhubAuthRedirect: User authenticated, navigating to /dashboard.');
  const redirectPath = sessionStorage.getItem('redirectPath') || '/dashboard';
  sessionStorage.removeItem('redirectPath');
  sessionStorage.removeItem('auth_processed');

      if (location.search) {
        navigate(redirectPath, { replace: true });
      } else {
        navigate(redirectPath, { replace: true });
      }
      return;
    }

    
    if (!isAuthenticated && !isLoading) {
      console.log('StudentHackhubAuthRedirect: Not authenticated, initiating login redirect.');
      if (!location.search.includes('error') && sessionStorage.getItem('auth_processed') !== 'true') {
        sessionStorage.setItem('auth_processed', 'true');
        login();
        return;
      }
      if (location.search.includes('error') || sessionStorage.getItem('auth_processed') === 'true') {
        setShowAuthIssueMessage(true);
      }
    }

    
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const idTokenHint = searchParams.get('id_token_hint');
    const postLogoutRedirectUri = searchParams.get('post_logout_redirect_uri');

    if (code || state || idTokenHint || postLogoutRedirectUri) {
      console.log('StudentHackhubAuthRedirect: Cleaning up URL search parameters.');
      navigate(location.pathname, { replace: true });
    }

  }, [isAuthenticated, isLoading, navigate, location.search, location.pathname, login]);

  const handleLogin = () => {
    setShowAuthIssueMessage(false);
    sessionStorage.setItem('auth_processed', 'true');
    login();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-lg">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-gray-200 text-center">
          <div className="text-center mb-8">
            <img src="/aws-logo.png" alt="AWS Logo" className="h-16 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Great Malaysia AI Hackathon</h1>
            <p className="text-gray-600">HackHub Portal</p>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-md text-blue-800 text-sm">
              <p>Initiating sign-in process...</p>
            </div>

            
            <Button
              onClick={handleLogin}
              className="w-full py-6 text-lg"
            >
              Sign in with Cognito
            </Button>

            {showAuthIssueMessage && (
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-lg">Redirecting...</p>
      </div>
    </div>
  );
};

export default StudentHackhubAuthRedirect;