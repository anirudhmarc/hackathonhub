import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';

const LogoutPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("LogoutPage: Landed after direct logout from Cognito.");
    localStorage.clear();
    sessionStorage.clear();

    const timer = setTimeout(() => {
      console.log("LogoutPage: Redirecting to /login.");
      navigate('/login', { replace: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <Spinner size="lg" />
      <p className="mt-4 text-lg">You have been logged out. Redirecting...</p>
    </div>
  );
};

export default LogoutPage;