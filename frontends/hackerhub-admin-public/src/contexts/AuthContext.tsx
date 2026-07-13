import React, { createContext, useContext } from 'react';
import { useAuth as useOidcContext } from 'react-oidc-context';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { name: string; email: string; groups: string[] } | null;
  idToken: string | undefined;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user, signinRedirect, signoutRedirect } = useOidcContext();

  const idToken = user?.id_token;

  const groups = (user?.profile as any)?.['cognito:groups'] || [];

  const simpleUser = user ? {
    name: user.profile.name || user.profile.preferred_username || user.profile.email || 'Admin',
    email: user.profile.email as string,
    groups: groups,
  } : null;

  const value = {
    isAuthenticated,
    isLoading,
    user: simpleUser,
    idToken: idToken,
    login: signinRedirect,
    logout: signoutRedirect,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};