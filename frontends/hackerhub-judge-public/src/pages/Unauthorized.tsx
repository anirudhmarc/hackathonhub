import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Unauthorized: React.FC = () => {
  const { logout } = useAuth();

  const handleLogoutClick = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-800 p-4">
      <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
      <p className="text-lg mb-6">You do not have the necessary permissions to view this page.</p>
      <Button onClick={handleLogoutClick}>
        Logout
      </Button>
    </div>
  );
};

export default Unauthorized;