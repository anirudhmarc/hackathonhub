import React from 'react';
import { useAuth } from 'react-oidc-context';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedGroups?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedGroups = [] }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userGroups = user?.profile?.['cognito:groups'] as string[] || [];
  const hasRequiredGroup = allowedGroups.length === 0 || allowedGroups.some(group => userGroups.includes(group));

  if (!hasRequiredGroup) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;