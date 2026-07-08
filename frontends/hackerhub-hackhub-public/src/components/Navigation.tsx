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
import { Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuth as useAuthOidc } from 'react-oidc-context';
import { useCurrentHackathon } from '@/contexts/CurrentHackathonContext';
import { isLocked, getLockReason } from '@/utils/navigationUtils';
import { useToast } from "@/hooks/use-toast";
import BrandLockup from '@/components/BrandLockup';
import HackathonSelector from '@/components/HackathonSelector';

const Navigation = () => {
  const authOidc = useAuthOidc();
  const { user } = useAuth();
  const { currentHackathon } = useCurrentHackathon();
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
          <BrandLockup size="sm" logoUrl={currentHackathon?.logo_url} />
        </Link>

        {user && (
          <nav className="hidden md:flex gap-10 ml-10">
            <Link to="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
                }`}>
              Dashboard
            </Link>

            <Link to="/problems"
              className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${isActive("/problems") ? "text-primary" : "text-muted-foreground"
                }`}>
              Agenda
            </Link>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/submission"
                    className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${isActive("/submission") ? "text-primary" : "text-muted-foreground"
                      }`}>
                    {isLocked("/submission", user, currentHackathon) && <Lock size={12} />}
                    Project Submission
                  </Link>
                </TooltipTrigger>
                {isLocked("/submission", user, currentHackathon) && (
                  <TooltipContent>
                    <p>{getLockReason("/submission", user, currentHackathon)}</p>
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
                    {isLocked("/feedback", user, currentHackathon) && <Lock size={12} />}
                    Feedback
                  </Link>
                </TooltipTrigger>
                {isLocked("/feedback", user, currentHackathon) && (
                  <TooltipContent>
                    <p>{getLockReason("/feedback", user, currentHackathon)}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </nav>
        )}

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <HackathonSelector className="hidden md:flex w-[200px]" />
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