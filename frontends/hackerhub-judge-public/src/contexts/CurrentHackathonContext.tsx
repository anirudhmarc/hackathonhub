import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  apiService,
  getCurrentHackathonId,
  setCurrentHackathonId as setApiHackathonId,
  type Hackathon,
} from '../services/api';

interface CurrentHackathonContextType {
  hackathons: Hackathon[];
  currentHackathonId: string | null;
  setCurrentHackathonId: (id: string) => void;
  isLoading: boolean;
}

const CurrentHackathonContext = createContext<CurrentHackathonContextType>({
  hackathons: [],
  currentHackathonId: null,
  setCurrentHackathonId: () => {},
  isLoading: true,
});

export const CurrentHackathonProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [currentHackathonId, setCurrentIdState] = useState<string | null>(getCurrentHackathonId());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Keep the api module + localStorage in sync, and update local state so that
  // consumers (and namespaced query keys) react to the change.
  const setCurrentHackathonId = useCallback((id: string) => {
    setApiHackathonId(id);
    setCurrentIdState(id);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;

    const loadHackathons = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.getHackathons();
        const data: Hackathon[] = Array.isArray(response?.data) ? response.data : [];

        if (!active) return;

        setHackathons(data);

        const storedId = getCurrentHackathonId();
        const storedIsValid = storedId && data.some((h) => h.id === storedId);

        if (storedIsValid) {
          // Persisted selection still valid; make sure state reflects it.
          setCurrentIdState(storedId);
        } else if (data.length === 1) {
          // Auto-select when the judge belongs to exactly one hackathon.
          setCurrentHackathonId(data[0].id);
        } else if (data.length > 1) {
          // Multiple hackathons and no valid stored selection: default to the
          // first so the app has a tenant to operate against; the judge can
          // switch via the Header select.
          setCurrentHackathonId(data[0].id);
        } else {
          // No hackathons available.
          setApiHackathonId(null);
          setCurrentIdState(null);
        }
      } catch {
        if (active) {
          setHackathons([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadHackathons();

    return () => {
      active = false;
    };
  }, [isAuthenticated, setCurrentHackathonId]);

  return (
    <CurrentHackathonContext.Provider
      value={{ hackathons, currentHackathonId, setCurrentHackathonId, isLoading }}
    >
      {children}
    </CurrentHackathonContext.Provider>
  );
};

export const useCurrentHackathon = (): CurrentHackathonContextType =>
  useContext(CurrentHackathonContext);
