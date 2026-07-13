import React from 'react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';

export const LoginButton: React.FC = () => {
  const { login } = useAuth();

  const handleLogin = () => {
    console.log("Login button clicked");
    login();
  };

  return (
    <Button onClick={handleLogin} className="w-full">
      Sign In
    </Button>
  );
};
