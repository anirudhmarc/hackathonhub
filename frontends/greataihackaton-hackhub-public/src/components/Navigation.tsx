import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogOut, Lock, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuth as useAuthOidc } from 'react-oidc-context';
import { isLocked, getLockReason } from '@/utils/navigationUtils';
import { useToast } from "@/hooks/use-toast";

const Navigation = () => {
  const authOidc = useAuthOidc();
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();


  const handleLogout = () => {
    console.log("Navigation: handleLogout STARTED (Participant App)");
    const clientId = import.meta.env.VITE_ADMIN_COGNITO_CLIENT_ID;
    const postLogoutRedirectUri = import.meta.env.VITE_ADMIN_COGNITO_LOGOUT_URI;
    const cognitoUserPoolDomain = import.meta.env.VITE_ADMIN_COGNITO_AUTH_DOMAIN;

    const idToken = authOidc.user?.id_token;

    let logoutUrl = `${cognitoUserPoolDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(postLogoutRedirectUri)}`;

    if (idToken) {
      logoutUrl += `&id_token_hint=${idToken}`;
    }

    console.log("Navigation: Constructed logout URL:", logoutUrl);

    localStorage.clear();
    sessionStorage.clear();
    console.log("Navigation: Local/Session Storage Cleared.");

    try {
        window.location.href = logoutUrl;
        console.log("Navigation: window.location.href assigned. Redirecting...");
    } catch (e) {
        console.error("Navigation: Error assigning window.location.href:", e);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return authOidc.isAuthenticated && (
    <header className="sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur-sm">
      <div className="aws-container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-4">
          {/* <img className="w-14" src="/aws-logo.png" alt="AWS Logo"></img> */}
          <span className="text-2xl font-bold ml-2 gradient-text">HackHub</span>
        </Link>

        {user && (
          <nav className="hidden md:flex gap-10 ml-10">
            <Link to="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
                }`}>
              Dashboard
            </Link>

            {user.track !== 'corporate' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/problems"
                      className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${isActive("/problems") ? "text-primary" : "text-muted-foreground"
                        }`}>
                      {isLocked("/problems", user) && <Lock size={12} />}
                      Problem Statements
                    </Link>
                  </TooltipTrigger>
                  {isLocked("/problems", user) && (
                    <TooltipContent>
                      <p>{getLockReason("/problems", user)}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/submission"
                    className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${isActive("/submission") ? "text-primary" : "text-muted-foreground"
                      }`}>
                    {isLocked("/submission", user) && <Lock size={12} />}
                    Project Submission
                  </Link>
                </TooltipTrigger>
                {isLocked("/submission", user) && (
                  <TooltipContent>
                    <p>{getLockReason("/submission", user)}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/feedback"
                    className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${isActive("/feedback") ? "text-primary" : "text-muted-foreground"
                      }`}>
                    {isLocked("/feedback", user) && <Lock size={12} />}
                    Feedback
                  </Link>
                </TooltipTrigger>
                {isLocked("/feedback", user) && (
                  <TooltipContent>
                    <p>{getLockReason("/feedback", user)}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </nav>
        )}

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              {user?.track && (
                <div className="hidden md:flex items-center gap-1 px-3 py-1 bg-aws-blue/10 rounded-full">
                  <BadgeCheck size={14} className="text-aws-blue" />
                  <span className="text-xs font-medium">{user.track.charAt(0).toUpperCase() + user.track.slice(1)} Track</span>
                </div>
              )}

              <span className="text-sm font-medium hidden md:block text-ellipsis max-w-72 w-fit overflow-hidden whitespace-nowrap ">
                {user?.email}
              </span>
              <Button onClick={handleLogout} variant="ghost">
                Logout
              </Button>
            </div>
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navigation;