import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const NotFound = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full text-center bg-white rounded-lg shadow-lg p-8">
        {/* AWS Logo */}
        <div className="mb-8">
          <img 
            src="/aws-logo.png" 
            alt="AWS Logo" 
            className="h-16 w-auto mx-auto mb-4"
          />
        </div>

        {/* Error Content */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Navigation Options */}
        <div className="space-y-4">
          {isAuthenticated ? (
            <>
              <Button 
                onClick={() => window.location.href = '/teams'} 
                className="w-full"
              >
                Go to Teams
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/results'} 
                variant="outline" 
                className="w-full"
              >
                View Results
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => window.location.href = '/'} 
              className="w-full"
            >
              Sign In
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Judging System - Malaysia AI Hackathon
          </p>
          {isAuthenticated && user && (
            <p className="text-xs text-gray-400 mt-1">
              Signed in as: {user.name || user.email || 'Judge'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
