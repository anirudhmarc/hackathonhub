
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Home, ArrowLeft, Search } from 'lucide-react';

const NotFound: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-card text-gray-800 p-4">
      {/* AWS Logo */}
      <div className="mb-8">
        <img src="/aws-logo.png" alt="AWS Logo" className="h-16 w-auto mx-auto" />
      </div>

      {/* 404 Content */}
      <div className="text-center max-w-lg">
        <h1 className="text-8xl font-bold mb-4 text-orange-500">404</h1>
        <h2 className="text-3xl font-bold mb-4 text-gray-700">Page Not Found</h2>
        <p className="text-lg mb-2 text-gray-600">
          Oops! The page you're looking for doesn't exist.
        </p>
        <p className="text-md mb-8 text-gray-500">
          The URL <code className="bg-gray-100 px-2 py-1 rounded text-sm">{location.pathname}</code> could not be found.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <>
              <Button onClick={handleBackToDashboard} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Home className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <Button variant="outline" onClick={handleGoBack} className="border-orange-500 text-orange-500 hover:bg-orange-50">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate('/login')} className="bg-orange-500 hover:bg-orange-600 text-white">
              <Home className="mr-2 h-4 w-4" />
              Go to Login
            </Button>
          )}
        </div>

        {/* Helpful Links */}
        {isAuthenticated && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">You might be looking for:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="ghost" size="sm" onClick={() => navigate('/problems')} className="text-blue-600 hover:text-blue-800">
                <Search className="mr-1 h-3 w-3" />
                Problems
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/feedback')} className="text-blue-600 hover:text-blue-800">
                <Search className="mr-1 h-3 w-3" />
                Feedback
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/submission')} className="text-blue-600 hover:text-blue-800">
                <Search className="mr-1 h-3 w-3" />
                Video Upload
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-400">
          <p>AWS Hackathon • Team Portal</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
