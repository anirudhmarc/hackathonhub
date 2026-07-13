import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import TeamsPage from '@/pages/TeamsPage';
import ResultsPage from '@/pages/ResultsPage';
import RubricPage from '@/pages/RubricPage';
import NotFound from '@/pages/NotFound';
import Unauthorized from '@/pages/Unauthorized';
import AuthCallback from '@/pages/AuthCallback';
import { HackathonProvider } from '@/contexts/HackathonContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CurrentHackathonProvider } from '@/contexts/CurrentHackathonContext';
import { Header } from '@/components/Header';
import './App.css';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from './contexts/AuthContext';
import { Spinner } from './components/ui/spinner';
import { Button } from './components/ui/button';
import ProtectedRoute from './components/auth/ProtectedRoute';
import BrandLockup from './components/BrandLockup';

const LoginPage = () => {
  const { login } = useAuth();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <BrandLockup size="lg" className="justify-center mb-4" />
          <h1 className="text-2xl font-bold">AWS Hackathon</h1>
          <p className="text-gray-600">Judging System</p>
        </div>
        
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-md text-blue-800 text-sm">
            <p>Please sign in to access the hackathon judging system.</p>
          </div>
          
          <Button 
            onClick={login} 
            className="w-full py-6 text-lg"
          >
            Sign in with Cognito
          </Button>
        </div>
      </div>
    </div>
  );
};

const AuthCodeHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    
    const hasTokens = sessionStorage.getItem('access_token') && sessionStorage.getItem('id_token');
    
    if (code && !hasTokens && !isProcessing) {
      setIsProcessing(true);
      setProcessingError(null);
      
      const processCode = async () => {
        try {
          const cognitoDomain = import.meta.env.VITE_ADMIN_COGNITO_AUTH_DOMAIN;
          const clientId = import.meta.env.VITE_ADMIN_COGNITO_CLIENT_ID;
          const redirectUri = import.meta.env.VITE_ADMIN_COGNITO_REDIRECT_URI;

          const tokenEndpoint = `${cognitoDomain}/oauth2/token`;
          
          const params = new URLSearchParams();
          params.append('grant_type', 'authorization_code');
          params.append('client_id', clientId);
          params.append('code', code);
          params.append('redirect_uri', redirectUri);
          
          const response = await axios.post(tokenEndpoint, params, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          
          sessionStorage.setItem('access_token', response.data.access_token);
          sessionStorage.setItem('id_token', response.data.id_token);
          if (response.data.refresh_token) {
            sessionStorage.setItem('refresh_token', response.data.refresh_token);
          }
          
          const idToken = response.data.id_token;
          const payload = JSON.parse(atob(idToken.split('.')[1]));
          
          const userName = payload.name || payload.email || payload['cognito:username'] || 'Unknown User';
          sessionStorage.setItem('user_name', userName);
          
          if (payload.email) {
            sessionStorage.setItem('user_email', payload.email);
          }
          
          const isAuthenticated = checkAuth();
          
          const authSuccessEvent = new CustomEvent('auth:success');
          window.dispatchEvent(authSuccessEvent);
          
          navigate('/teams', { replace: true });
          setIsProcessing(false);
        } catch (err: any) {
          setProcessingError(err.message || 'Failed to process authentication');
          setIsProcessing(false);
          
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('id_token');
          sessionStorage.removeItem('refresh_token');
          
          navigate('/', { replace: true });
        }
      };
      
      processCode();
    }
  }, [location, navigate, checkAuth, isProcessing]);

  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex flex-col items-center">
            <Spinner size="lg" />
            <p className="mt-4 text-lg font-medium">Processing authentication...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we complete your sign-in</p>
          </div>
        </div>
      </div>
    );
  }

  if (processingError) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">Authentication Error</h3>
            <p className="text-sm text-gray-500 mt-2 text-center">{processingError}</p>
            <button 
              onClick={() => navigate('/', { replace: true })}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  
  const hasAuthCode = new URLSearchParams(location.search).has('code');
  
  if (isLoading || hasAuthCode) {
    return (
      <>
        <AuthCodeHandler />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4">Loading application...</p>
          </div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    if (location.pathname !== '/') {
      return (
        <>
          <AuthCodeHandler />
          <Navigate to="/" replace />
        </>
      );
    }
    return <LoginPage />;
  }

  return (
    <>
      <AuthCodeHandler />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full">
          <Routes>
            <Route path="/" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
            
            <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
            <Route path="/rubric" element={<ProtectedRoute><RubricPage /></ProtectedRoute>} />

            <Route path="/auth-callback" element={<AuthCallback />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
      <Toaster />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CurrentHackathonProvider>
        <HackathonProvider>
          <Router>
            <AppContent />
          </Router>
        </HackathonProvider>
      </CurrentHackathonProvider>
    </AuthProvider>
  );
}

export default App;
