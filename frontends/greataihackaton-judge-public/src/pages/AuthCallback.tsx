import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../components/ui/spinner';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const existingToken = sessionStorage.getItem('access_token');
    if (existingToken) {
      const redirectPath = sessionStorage.getItem('redirectPath');
      if (redirectPath) {
        sessionStorage.removeItem('redirectPath');
        navigate(redirectPath);
      } else {
        navigate('/teams');
      }
      return;
    }

    const exchangeCodeForTokens = async (code: string) => {
      try {
        const cognitoDomain = import.meta.env.VITE_ADMIN_COGNITO_AUTH_DOMAIN;
        const clientId = import.meta.env.VITE_ADMIN_COGNITO_CLIENT_ID;

        const tokenEndpoint = `${cognitoDomain}/oauth2/token`;

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', clientId);
        params.append('code', code);
        params.append('redirect_uri', import.meta.env.VITE_ADMIN_COGNITO_REDIRECT_URI);

        const response = await axios.post(tokenEndpoint, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        sessionStorage.setItem('access_token', response.data.access_token);
        sessionStorage.setItem('id_token', response.data.id_token);
        sessionStorage.setItem('refresh_token', response.data.refresh_token);

        setAuthenticated(true);

        checkAuth();

        setTimeout(() => {
          const redirectPath = sessionStorage.getItem('redirectPath');
          if (redirectPath) {
            sessionStorage.removeItem('redirectPath');
            navigate(redirectPath);
          } else {
            navigate('/teams');
          }
        }, 3000);
      } catch (err) {
        setError('Failed to complete authentication. Please try again.');
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      exchangeCodeForTokens(code);
    } else {
      setError('Authentication failed. No authorization code received.');
    }
  }, [navigate, checkAuth]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to Login
        </button>
      </div>
    );
  }

  if (authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Authentication Successful!</h2>
          <p className="mb-4">Redirecting you to the judging system...</p>
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Spinner size="lg" />
      <p className="mt-4 text-lg">Completing authentication, please wait...</p>
    </div>
  );
};

export default AuthCallback;
