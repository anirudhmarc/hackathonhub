import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuth as useAuthOidc } from 'react-oidc-context';
import { useCurrentHackathon } from '@/contexts/CurrentHackathonContext';
import { isLocked } from '@/utils/navigationUtils';
import { useToast } from "@/hooks/use-toast";
import BrandLockup from '@/components/BrandLockup';
import HackathonSelector from '@/components/HackathonSelector';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { currentHackathon } = useCurrentHackathon();
  const authOidc = useAuthOidc();
  const location = useLocation();
  const { toast } = useToast();

  const closeMenu = () => setOpen(false);

  const handleLogoutClick = () => {
    console.log("MobileNav: handleLogout STARTED (Participant App)");
    const clientId = import.meta.env.VITE_ADMIN_COGNITO_CLIENT_ID;
    const postLogoutRedirectUri = import.meta.env.VITE_ADMIN_COGNITO_LOGOUT_URI;
    const cognitoUserPoolDomain = import.meta.env.VITE_ADMIN_COGNITO_AUTH_DOMAIN;

    const idToken = authOidc.user?.id_token;

    let logoutUrl = `${cognitoUserPoolDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(postLogoutRedirectUri)}`;

    if (idToken) {
      logoutUrl += `&id_token_hint=${idToken}`;
    }

    console.log("MobileNav: Constructed logout URL:", logoutUrl);

    localStorage.clear();
    sessionStorage.clear();
    console.log("MobileNav: Local/Session Storage Cleared.");

    window.location.href = logoutUrl;
    console.log("MobileNav: window.location.href assigned. Redirecting...");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="md:hidden"
          size="icon"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-white">
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
              <BrandLockup size="sm" logoUrl={currentHackathon?.logo_url} />
            </Link>
          </div>

          {authOidc.isAuthenticated ? (
            <>
              <div className="border-b pb-4 mb-4">
                <p className="text-sm font-medium px-2">
                  Signed in as: {user?.name || user?.email}
                </p>
                {user?.teamName && (
                  <p className="text-sm text-muted-foreground px-2">
                    Team: {user.teamName}
                  </p>
                )}
                <div className="px-2 mt-3">
                  <HackathonSelector className="w-full" />
                </div>
              </div>
              <Link
                to="/dashboard"
                onClick={closeMenu}
                className="flex items-center py-2 px-2 rounded-md hover:bg-muted"
              >
                Dashboard
              </Link>
              <Link
                to="/problems"
                onClick={closeMenu}
                className="flex items-center py-2 px-2 rounded-md hover:bg-muted"
              >
                Agenda
              </Link>
              <Link
                to="/submission"
                onClick={closeMenu}
                className={`flex items-center py-2 px-2 rounded-md hover:bg-muted ${isLocked("/submission", user, currentHackathon) ? "text-muted-foreground" : ""}`}
              >
                {isLocked("/submission", user, currentHackathon) && <Lock size={16} className="mr-2" />}
                Project Submission
              </Link>
              <Link
                to="/feedback"
                onClick={closeMenu}
                className={`flex items-center py-2 px-2 rounded-md hover:bg-muted ${isLocked("/feedback", user, currentHackathon) ? "text-muted-foreground" : ""}`}
              >
                {isLocked("/feedback", user, currentHackathon) && <Lock size={16} className="mr-2" />}
                Feedback
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start py-2 px-2 rounded-md hover:bg-muted text-destructive"
                onClick={() => {
                  setOpen(false);
                  handleLogoutClick();
                }}
              >
                <LogOut className="h-5 w-5 mr-2" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex items-center py-2 px-2 rounded-md hover:bg-muted"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MobileNav;