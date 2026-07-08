import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../ui/spinner';
import { useLocation, Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isJudge, isLoading, login } = useAuth();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <p className="mt-4 text-lg">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!redirecting) {
      setRedirecting(true);
      sessionStorage.setItem('redirectPath', location.pathname);
      login();
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <p className="mt-4 text-lg">Redirecting to login...</p>
      </div>
    );
  }

  if (!isJudge) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;