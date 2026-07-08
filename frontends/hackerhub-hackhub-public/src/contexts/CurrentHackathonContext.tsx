import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth as useAuthOidc } from "react-oidc-context";
import axios from "axios";
import {
  hackathonsUrl,
  hackathonUrl,
  authHeaders,
} from "@/lib/apiClient";
import { Hackathon } from "@/types/hackathon";

const CURRENT_HACKATHON_STORAGE_KEY = "awsHackHubCurrentHackathonId";

interface CurrentHackathonContextType {
  hackathons: Hackathon[];
  currentHackathon: Hackathon | null;
  currentHackathonId: string | null;
  // True while we are resolving the participant's hackathon memberships
  // and/or the current hackathon's full record.
  isLoading: boolean;
  setCurrentHackathonId: (id: string) => void;
}

const CurrentHackathonContext = createContext<
  CurrentHackathonContextType | undefined
>(undefined);

const normalizeHackathonList = (data: unknown): Hackathon[] => {
  // The endpoint may return a bare array or an envelope like { hackathons: [...] }.
  if (Array.isArray(data)) return data as Hackathon[];
  if (data && typeof data === "object") {
    const maybe = data as Record<string, unknown>;
    if (Array.isArray(maybe.hackathons)) return maybe.hackathons as Hackathon[];
    if (Array.isArray(maybe.items)) return maybe.items as Hackathon[];
  }
  return [];
};

const normalizeHackathon = (data: unknown): Hackathon | null => {
  if (!data || typeof data !== "object") return null;
  const maybe = data as Record<string, unknown>;
  // GET /hackathons/{id} may wrap the record.
  if (maybe.hackathon && typeof maybe.hackathon === "object") {
    return maybe.hackathon as Hackathon;
  }
  return data as Hackathon;
};

export const CurrentHackathonProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const authOidc = useAuthOidc();
  const idToken = authOidc.user?.id_token || null;

  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [currentHackathonId, setCurrentHackathonIdState] = useState<
    string | null
  >(() => localStorage.getItem(CURRENT_HACKATHON_STORAGE_KEY));
  const [currentHackathon, setCurrentHackathon] = useState<Hackathon | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentHackathonId = useCallback((id: string) => {
    setCurrentHackathonIdState(id);
    if (id) {
      localStorage.setItem(CURRENT_HACKATHON_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_HACKATHON_STORAGE_KEY);
    }
    // Clear the cached full record; it will be re-fetched for the new id.
    setCurrentHackathon(null);
  }, []);

  // Step 1: once authenticated, fetch the participant's hackathon memberships.
  useEffect(() => {
    let cancelled = false;

    const loadHackathons = async () => {
      if (!authOidc.isAuthenticated || !idToken) {
        if (!authOidc.isLoading) {
          setHackathons([]);
          setCurrentHackathon(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const response = await axios.get(hackathonsUrl(), {
          headers: authHeaders(idToken),
        });
        if (cancelled) return;

        const list = normalizeHackathonList(response.data);
        setHackathons(list);

        // Resolve the selected id: keep the stored one if still valid,
        // else auto-select when exactly one hackathon is available.
        const storedId = localStorage.getItem(CURRENT_HACKATHON_STORAGE_KEY);
        const storedStillValid =
          !!storedId && list.some((h) => h.hackathon_id === storedId);

        if (storedStillValid) {
          setCurrentHackathonIdState(storedId);
        } else if (list.length === 1) {
          const only = list[0].hackathon_id;
          setCurrentHackathonIdState(only);
          localStorage.setItem(CURRENT_HACKATHON_STORAGE_KEY, only);
        } else {
          // Multiple (or zero) and no valid stored selection: leave unselected
          // so the selector can prompt the user.
          setCurrentHackathonIdState(null);
          localStorage.removeItem(CURRENT_HACKATHON_STORAGE_KEY);
        }
      } catch (error) {
        if (cancelled) return;
        console.error(
          "CurrentHackathonContext: Failed to load hackathons:",
          error
        );
        setHackathons([]);
        setCurrentHackathonIdState(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadHackathons();
    return () => {
      cancelled = true;
    };
  }, [authOidc.isAuthenticated, authOidc.isLoading, idToken]);

  // Step 2: whenever the selected id changes, fetch that hackathon's full
  // record (which carries the timeline fields used for date-gating).
  useEffect(() => {
    let cancelled = false;

    const loadCurrent = async () => {
      if (!currentHackathonId || !idToken) {
        setCurrentHackathon(null);
        return;
      }

      // Prefer the record already present in the list if it looks complete,
      // but always re-fetch the single record to guarantee timeline fields.
      try {
        const response = await axios.get(hackathonUrl(currentHackathonId), {
          headers: authHeaders(idToken),
        });
        if (cancelled) return;
        const record = normalizeHackathon(response.data);
        setCurrentHackathon(record);
      } catch (error) {
        if (cancelled) return;
        console.error(
          "CurrentHackathonContext: Failed to load current hackathon:",
          error
        );
        // Fall back to the list entry if we have it.
        const fromList =
          hackathons.find((h) => h.hackathon_id === currentHackathonId) || null;
        setCurrentHackathon(fromList);
      }
    };

    loadCurrent();
    return () => {
      cancelled = true;
    };
    // hackathons intentionally excluded to avoid refetch loops; it is only used
    // as a fallback and reflects the same auth session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHackathonId, idToken]);

  const value: CurrentHackathonContextType = {
    hackathons,
    currentHackathon,
    currentHackathonId,
    isLoading,
    setCurrentHackathonId,
  };

  return (
    <CurrentHackathonContext.Provider value={value}>
      {children}
    </CurrentHackathonContext.Provider>
  );
};

export const useCurrentHackathon = (): CurrentHackathonContextType => {
  const context = useContext(CurrentHackathonContext);
  if (context === undefined) {
    throw new Error(
      "useCurrentHackathon must be used within a CurrentHackathonProvider"
    );
  }
  return context;
};
