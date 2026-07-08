import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import SEOHead from '@/components/SEOHead';
import BrandLockup from '@/components/BrandLockup';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log("Login.tsx: Authenticated. Redirecting to dashboard.");
      navigate("/dashboard", { replace: true });
      return;
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSignIn = () => {
    console.log("Login.tsx: User clicked sign in. Directly initiating Cognito login.");
    login();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="mt-4 text-lg">Loading authentication status...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Login | AWS Hackathon Team Portal"
        description="Sign in to the Team Portal for the AWS Hackathon. Build the future of Voice AI — work backwards from a real customer pain point. Access your team dashboard and submit your project."
        keywords="Voice AI Hackathon Login, AWS Hackathon Sign In, Team Portal Access, Voice AI"
        canonical="/login"
      />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-gray-200 text-center">
          <div className="text-center mb-8">
            <img src="/aws-logo.png" alt="AWS Logo" className="h-16 w-auto mx-auto mb-4" />
            <BrandLockup size="lg" className="justify-center mb-4" />
            <h1 className="text-2xl font-bold">AWS Hackathon</h1>
            <p className="text-gray-600">Team Portal</p>
          </div>
          
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-md text-blue-800 text-sm">
              <p>Please sign in to access the hackathon participant portal system.</p>
            </div>
            
            <Button onClick={handleSignIn} className="w-full py-6 text-lg">
              Sign in with Cognito
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;