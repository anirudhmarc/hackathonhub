import React, { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useLocation, useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const userGroups = (auth.user?.profile?.['cognito:groups'] || []) as string[];
  const isAuthorized = userGroups.includes('Participants');

  if (auth.error) {
    console.error("ProtectedRoute: OIDC Error encountered:", auth.error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 p-4">
        <p>Authentication Error: {auth.error.message}</p>
        <button onClick={() => navigate('/login')} className="ml-4 px-4 py-2 bg-red-500 text-white rounded">
          Try Login Again
        </button>
      </div>
    );
  }

  useEffect(() => {
    if (!auth.isAuthenticated && !auth.isLoading) {
        console.log('ProtectedRoute: User not authenticated, redirecting to login page.');
        sessionStorage.setItem('redirectPath', location.pathname);
        navigate('/login', { replace: true });
    } else if (auth.isAuthenticated && !auth.isLoading && !isAuthorized) {
        console.log('ProtectedRoute: User not authorized, redirecting to unauthorized page.');
        navigate('/unauthorized', { replace: true });
    }

    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (auth.isAuthenticated && (code || state)) {
      navigate({ pathname: location.pathname, search: '' }, { replace: true });
    }
  }, [auth.isAuthenticated, auth.isLoading, location, navigate, isAuthorized]);

  if (auth.isAuthenticated && isAuthorized) {
    return (<>{children}</>);
  } else {
    if (auth.isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen">
          <img src="/aws-logo.png" alt="AWS Logo" className="h-12 w-auto mx-auto mb-4 animate-pulse"></img>
          <p className="mt-4 text-lg">Checking authentication status...</p>
        </div>
      );
    } else {
      return null;
    }
  }
};

export default ProtectedRoute;