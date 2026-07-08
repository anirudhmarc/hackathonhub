import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserInfo {
  name: string;
  email?: string;
  username?: string;
  sub?: string;
  groups?: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  isJudge: boolean;
  isLoading: boolean;
  accessToken: string | null;
  idToken: string | null;
  user: UserInfo | null;
  login: () => void;
  logout: () => void;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isJudge, setIsJudge] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);

  const extractUserInfo = (token: string): UserInfo => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        name: payload.name || payload.email || payload['cognito:username'] || 'Unknown User',
        email: payload.email,
        username: payload['cognito:username'],
        sub: payload.sub,
        groups: payload['cognito:groups'] || []
      };
    } catch (error) {
      return { name: 'Unknown User' };
    }
  };

  const checkAuth = () => {
    setIsLoading(true);
    
    const storedAccessToken = sessionStorage.getItem('access_token');
    const storedIdToken = sessionStorage.getItem('id_token');
    const storedUserName = sessionStorage.getItem('user_name');
    
    let newAuthState = false;
    let newUser = null;
    let isUserJudge = false;
    
    if (storedAccessToken && storedIdToken) {
      try {
        const payload = JSON.parse(atob(storedIdToken.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        
        if (Date.now() < expirationTime) {
          setAccessToken(storedAccessToken);
          setIdToken(storedIdToken);
          newAuthState = true;
          
          newUser = extractUserInfo(storedIdToken);

          if (newUser?.groups?.includes('Judges')) {
            isUserJudge = true;
          }
          
          sessionStorage.setItem('user_name', newUser.name);
          if (newUser.email) {
            sessionStorage.setItem('user_email', newUser.email);
          }
        } else {
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('id_token');
          sessionStorage.removeItem('refresh_token');
          sessionStorage.removeItem('user_name');
        }
      } catch (error) {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('id_token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('user_name');
      }
    } else if (storedUserName) {
      newUser = { name: storedUserName };
    }
    
    setUser(newUser);
    setIsAuthenticated(newAuthState);
    setIsJudge(isUserJudge);
    setIsLoading(false);
    
    return newAuthState;
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkAuth();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const login = () => {
    const clientId = import.meta.env.VITE_ADMIN_COGNITO_CLIENT_ID;
    const cognitoDomain = import.meta.env.VITE_ADMIN_COGNITO_AUTH_DOMAIN;
    const redirectUri = encodeURIComponent(import.meta.env.VITE_ADMIN_COGNITO_REDIRECT_URI);

    const loginUrl = `${cognitoDomain}/login?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email+openid+profile`;
    window.location.href = loginUrl;
  };

  const logout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('id_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user_name');
    
    setAccessToken(null);
    setIdToken(null);
    setIsAuthenticated(false);
    setUser(null);
    
    const clientId = import.meta.env.VITE_ADMIN_COGNITO_CLIENT_ID;
    const cognitoDomain = import.meta.env.VITE_ADMIN_COGNITO_AUTH_DOMAIN;
    const logoutUri = encodeURIComponent(import.meta.env.VITE_ADMIN_COGNITO_LOGOUT_URI);

    const logoutUrl = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
    window.location.href = logoutUrl;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isJudge,
        isLoading,
        accessToken,
        idToken,
        user,
        login,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
