import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';

import { AuthProvider } from "@/contexts/AuthContext";
import { CurrentHackathonProvider } from "@/contexts/CurrentHackathonContext";
import Navigation from "@/components/Navigation";
import MobileNav from "@/components/MobileNav";
import ProtectedRoute from "@/components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Problems from "./pages/Problems";
import Video from "./pages/Video";
import Feedback from "./pages/Feedback";
import Logout from "./pages/Logout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Callback from "./pages/Callback";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import ParticipantAuthRedirect from "./pages/ParticipantAuthRedirect";

const queryClient = new QueryClient();

const App = () => {
  const location = useLocation();
  const noSidebarPaths = ['/login', '/register', '/logout', '/callback', '/unauthorized', '/auth-redirect'];
  const showSidebar = !noSidebarPaths.includes(location.pathname);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CurrentHackathonProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <div className="flex flex-col min-h-screen">
              {showSidebar && (
                <div className="sticky top-0 z-40 flex items-center justify-between md:hidden">
                  <div className="flex items-center">
                    <MobileNav />
                  </div>
                </div>
              )}
              {showSidebar && (
                <div className="hidden md:block">
                  <Navigation />
                </div>
              )}
              <div className="flex-grow">
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route path="/login" element={<Login />} />

                  <Route path="/auth-redirect" element={<ParticipantAuthRedirect />} />

                  <Route path="/callback" element={<Callback />} />

                  <Route path="/logout" element={<Logout />} />

                  <Route path="/unauthorized" element={<Unauthorized />} />

                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/problems" element={<ProtectedRoute><Problems /></ProtectedRoute>} />
                  <Route path="/submission" element={<ProtectedRoute><Video /></ProtectedRoute>} />
                  <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </AuthProvider>
          </CurrentHackathonProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;