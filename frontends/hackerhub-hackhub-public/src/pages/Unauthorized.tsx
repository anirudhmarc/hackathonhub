import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth as useAuthOidc } from 'react-oidc-context';
import { useAuth } from '@/contexts/AuthContext';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const authOidc = useAuthOidc();
  const { user } = useAuth();

  const handleLogoutClick = () => {
    console.log("Unauthorized.tsx: Initiating direct logout from Unauthorized page.");

    const clientId = import.meta.env.VITE_ADMIN_COGNITO_CLIENT_ID;
    const postLogoutRedirectUri = import.meta.env.VITE_ADMIN_COGNITO_LOGOUT_URI;
    const cognitoUserPoolDomain = import.meta.env.VITE_ADMIN_COGNITO_AUTH_DOMAIN;

    const idToken = authOidc.user?.id_token;

    let logoutUrl = `${cognitoUserPoolDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(postLogoutRedirectUri)}`;

    if (idToken) {
      logoutUrl += `&id_token_hint=${idToken}`;
    }

    console.log("Unauthorized.tsx: Constructed logout URL:", logoutUrl);

    localStorage.clear();
    sessionStorage.clear();
    console.log("Unauthorized.tsx: Local/Session Storage Cleared.");

    try {
      window.location.href = logoutUrl;
      console.log("Unauthorized.tsx: window.location.href assigned. Redirecting...");
    } catch (e) {
      console.error("Unauthorized.tsx: Error assigning window.location.href:", e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-800 p-4">
      <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
      <p className="text-lg mb-6">You do not have the necessary permissions to view this page.</p>
      <Button onClick={handleLogoutClick}>
        Logout and Go to Login
      </Button>
    </div>
  );
};

export default Unauthorized;