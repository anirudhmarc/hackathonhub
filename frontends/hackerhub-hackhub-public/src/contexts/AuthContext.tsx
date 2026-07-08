import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useAuthOidc } from 'react-oidc-context';
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UserData } from "@/types/user";
import { useCurrentHackathon } from "@/contexts/CurrentHackathonContext";
import { buildUrl, authHeaders } from "@/lib/apiClient";

// The participant profile cache is namespaced per hackathon to avoid
// cross-tenant bleed when a participant belongs to more than one hackathon.
const userStorageKey = (hackathonId: string | null) =>
  `awsHackHubUser:${hackathonId ?? "none"}`;

export interface User {
  id: string;
  email: string;
  name: string;
  teamName: string | null;
  teamId: string | null;
  problemId: string | null;
  track?: string | null;
  videoUrl?: string | null;
  hasSubmitted?: boolean;
  hasScores?: boolean;
  gitlabUrl?: string | null;
  submissionProjectDescription?: string | null;
  submissionAdditionalMaterialsUrls?: string[] | null;
  lastSubmitted?: string | null;
  submissionId?: string | null; 
  cognitoGroups: string[];
}

interface DashboardData {
  hasTeamRegistered: boolean;
  teamInfo: {
    teamId: string;
    teamName: string;
    problemId: string | null;
    track: string | null;
    videoUrl: string | null;
    hasSubmitted: boolean;
    gitlabUrl?: string | null;
    submissionProjectDescription?: string | null;
    submissionAdditionalMaterialsUrls?: string[] | null;
    lastSubmitted?: string | null;
  } | null;
  availableTracks: { id: string; title: string; }[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  idToken: string | null;
  user: User | null;
  login: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUserTeam: (
    teamName: string | null,
    teamId: string | null,
    problemId: string | null,
    track: string | null,
    videoUrl?: string | null,
    hasSubmitted_param?: boolean,
    gitlabUrl_param?: string | null,
    submissionProjectDescription_param?: string | null,
    submissionAdditionalMaterialsUrls_param?: string[] | null,
    lastSubmitted_param?: string | null
  ) => void;
  availableTracks: { id: string; title: string; }[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authOidc = useAuthOidc();
  const {
    currentHackathonId,
    isLoading: hackathonLoading,
  } = useCurrentHackathon();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [availableTracks, setAvailableTracks] = useState<{ id: string; title: string; }[]>([]);

  useEffect(() => {
    const processAuth = async () => {
      if (authOidc.isAuthenticated && authOidc.user) {
          // Hydration is hackathon-scoped: wait until the participant's
          // hackathon memberships have been resolved and a current hackathon
          // has been chosen (auto-selected when there is exactly one).
          if (hackathonLoading) {
              setLoading(true);
              return;
          }
          if (!currentHackathonId) {
              // Authenticated but no hackathon selected yet (e.g. multiple and
              // the user hasn't picked one). Nothing to hydrate.
              setUser(null);
              setAvailableTracks([]);
              setLoading(false);
              return;
          }

          setLoading(true);

          try {
              const token = authOidc.user?.id_token || authOidc.user?.access_token;
              if (!token) { throw new Error("No authentication token available to fetch user team data."); }

              const response = await axios.get<DashboardData>(buildUrl(currentHackathonId, "teams"), {
                  headers: authHeaders(token)
              });

              const { teamInfo, availableTracks: fetchedTracks } = response.data;

              let submissionId = null;
              let gitlabUrl = teamInfo?.gitlabUrl;
              let submissionProjectDescription = teamInfo?.submissionProjectDescription;
              let submissionAdditionalMaterialsUrls = teamInfo?.submissionAdditionalMaterialsUrls;
              let lastSubmitted = teamInfo?.lastSubmitted;
              let videoUrl = teamInfo?.videoUrl;
              let hasSubmitted = teamInfo?.hasSubmitted === true;

              if (teamInfo?.hasSubmitted) {
                  try {
                      const submissionResponse = await axios.get(buildUrl(currentHackathonId, "submissions"), {
                          headers: authHeaders(token)
                      });

                      const submissionData = submissionResponse.data.submission;
                      if (submissionData) {
                          submissionId = submissionData.submission_id;
                          gitlabUrl = submissionData.github_url;
                          submissionProjectDescription = submissionData.submission_project_description;
                          submissionAdditionalMaterialsUrls = submissionData.submission_additional_materials_url;
                          lastSubmitted = submissionData.last_updated;
                          videoUrl = submissionData.submission_video_url;
                      }
                  } catch (error) {
                      console.error("AuthContext: Failed to fetch submission details:", error);
                  }
              }

              const cognitoGroups = (authOidc.user.profile as any)?.['cognito:groups'] || [];

              let parsedAdditionalUrls: string[] | null = null;
              if (teamInfo?.submissionAdditionalMaterialsUrls && typeof teamInfo.submissionAdditionalMaterialsUrls === 'string') {
                  try { parsedAdditionalUrls = JSON.parse(teamInfo.submissionAdditionalMaterialsUrls); }
                  catch (e) { console.error("AuthContext: Failed to parse additional materials URL string:", e); parsedAdditionalUrls = []; }
              } else if (Array.isArray(teamInfo?.submissionAdditionalMaterialsUrls)) {
                  parsedAdditionalUrls = teamInfo.submissionAdditionalMaterialsUrls;
              }

              const customUser: User = {
                  id: authOidc.user.profile.sub,
                  email: authOidc.user.profile.email || '',
                  name: authOidc.user.profile.name || authOidc.user.profile.preferred_username || authOidc.user.profile.email?.split('@')[0] || 'User',
                  teamName: teamInfo?.teamName || null,
                  teamId: teamInfo?.teamId || null,
                  problemId: teamInfo?.problemId || null,
                  track: teamInfo?.track || null,
                  videoUrl: teamInfo?.videoUrl || null,
                  hasSubmitted: teamInfo?.hasSubmitted === true,

                  gitlabUrl: teamInfo?.gitlabUrl || null,
                  submissionProjectDescription: teamInfo?.submissionProjectDescription || null,
                  submissionAdditionalMaterialsUrls: parsedAdditionalUrls,
                  lastSubmitted: teamInfo?.lastSubmitted || null,
                  submissionId: submissionId,
                  cognitoGroups: cognitoGroups
              };
              setUser(customUser);
              localStorage.setItem(userStorageKey(currentHackathonId), JSON.stringify(customUser));
              setAvailableTracks(fetchedTracks);

          } catch (error) {
              console.error("AuthContext: Error fetching dashboard data:", error);
              setUser(null);
              localStorage.removeItem(userStorageKey(currentHackathonId));
              setAvailableTracks([]);
              toast({
                  title: "Error",
                  description: "Failed to load user profile or dashboard data. Please try again.",
                  variant: "destructive",
              });
          } finally {
              setLoading(false);
          }
      } else if (authOidc.error) {
          console.error("AuthContext: OIDC Error:", authOidc.error);
          setUser(null);
          localStorage.removeItem(userStorageKey(currentHackathonId));
          setAvailableTracks([]);
          setLoading(false);
      } else if (!authOidc.isLoading && !authOidc.isAuthenticated) {
          if (user !== null) {
              setUser(null);
              localStorage.removeItem(userStorageKey(currentHackathonId));
          }
          setAvailableTracks([]);
          setLoading(false);
      } else {
          setLoading(true);
      }
    };

    if (!authOidc.isLoading || authOidc.isAuthenticated !== undefined) {
        processAuth();
    }
  }, [authOidc.isAuthenticated, authOidc.user, authOidc.isLoading, authOidc.error, currentHackathonId, hackathonLoading]);

  const login = async () => {
    try {
      await authOidc.signinRedirect();
    } catch (error) {
      console.error("AuthContext: Error initiating signinRedirect:", error);
      toast({ title: "Login Error", description: "Failed to initiate login.", variant: "destructive" });
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      await authOidc.signinRedirect();
    } catch (error) {
      console.error("AuthContext: Error initiating signinRedirect for registration:", error);
      toast({ title: "Registration Error", description: "Failed to initiate registration.", variant: "destructive" });
    }
  };

  const logout = () => {
      console.log("AuthContext: Custom logout called (no action, handled by Navigation).");
  };

  const updateUserTeam = (
    teamName: string | null,
    teamId: string | null,
    problemId: string | null,
    track: string | null,
    videoUrl?: string | null,
    hasSubmitted_param?: boolean,
    gitlabUrl_param?: string | null,
    submissionProjectDescription_param?: string | null,
    submissionAdditionalMaterialsUrls_param?: string[] | null,
    lastSubmitted_param?: string | null,
    submissionId_param?: string | null
  ) => {
    if (authOidc.user) {
        const cognitoGroups = (authOidc.user.profile as any)?.['cognito:groups'] || [];
        const updatedUser = {
                              ...user,
                              id: authOidc.user.profile.sub,
                              email: authOidc.user.profile.email || '',
                              name: authOidc.user.profile.name || authOidc.user.profile.preferred_username || authOidc.user.profile.email?.split('@')[0] || 'User',
                              teamName,
                              teamId,
                              problemId,
                              track,
                              videoUrl,
                              hasSubmitted: hasSubmitted_param !== undefined ? hasSubmitted_param : (user?.hasSubmitted || false),

                              gitlabUrl: gitlabUrl_param !== undefined ? gitlabUrl_param : (user?.gitlabUrl || null),
                              submissionProjectDescription: submissionProjectDescription_param !== undefined ? submissionProjectDescription_param : (user?.submissionProjectDescription || null),
                              submissionAdditionalMaterialsUrls: submissionAdditionalMaterialsUrls_param !== undefined ? submissionAdditionalMaterialsUrls_param : (user?.submissionAdditionalMaterialsUrls || null),
                              lastSubmitted: lastSubmitted_param !== undefined ? lastSubmitted_param : (user?.lastSubmitted || null),
                              submissionId: submissionId_param !== undefined ? submissionId_param : (user?.submissionId || null),

                              cognitoGroups
                            } as User;
        setUser(updatedUser);
        localStorage.setItem(userStorageKey(currentHackathonId), JSON.stringify(updatedUser));
    } else {
        toast({
            title: "Team Update Failed",
            description: "No active login session to associate team with. Please log in first.",
            variant: "destructive",
        });
    }
  };

  const value = {
    isAuthenticated: authOidc.isAuthenticated,
    isLoading: loading,
    accessToken: authOidc.user?.access_token || null,
    idToken: authOidc.user?.id_token || null,
    user,
    login,
    register,
    logout,
    updateUserTeam,
    availableTracks,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};