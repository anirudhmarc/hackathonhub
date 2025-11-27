import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from 'react-oidc-context';

const NotFound: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <img 
            src="/aws-logo.png" 
            alt="AWS Logo" 
            className="h-16 w-auto mx-auto mb-4"
          />
        </div>

        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="space-y-4">
          {isAuthenticated ? (
            <>
              <Button asChild className="w-full">
                <Link to="/">Go to Dashboard</Link>
              </Button>
              
              {Array.isArray(user?.profile?.['cognito:groups']) && (user.profile['cognito:groups'] as string[]).includes('Admins') && (
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/teams">Manage Teams</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/judges">Manage Judges</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/participants">Participants</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/leaderboard">View Results</Link>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Button asChild className="w-full">
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Admin System - Malaysia AI Hackathon
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;