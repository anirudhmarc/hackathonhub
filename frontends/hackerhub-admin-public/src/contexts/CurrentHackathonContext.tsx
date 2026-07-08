import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL: string = import.meta.env.VITE_API_URL;
const STORAGE_KEY = 'hackhub.currentHackathonId';

export interface Hackathon {
  hackathon_id: string;
  name: string;
  status?: string | null;
  submission_start?: string | null;
  submission_end?: string | null;
  scoring_start?: string | null;
  scoring_end?: string | null;
  scoring_lock?: string | null;
  logo_url?: string | null;
  // Allow any additional timeline fields the API returns.
  [key: string]: unknown;
}

interface CurrentHackathonContextType {
  hackathons: Hackathon[];
  currentHackathon: Hackathon | null;
  currentHackathonId: string | null;
  setCurrentHackathonId: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CurrentHackathonContext = createContext<CurrentHackathonContextType | undefined>(undefined);

export const useCurrentHackathon = (): CurrentHackathonContextType => {
  const context = useContext(CurrentHackathonContext);
  if (context === undefined) {
    throw new Error('useCurrentHackathon must be used within a CurrentHackathonProvider');
  }
  return context;
};

// Normalize possible API response shapes into an array of hackathons.
function extractHackathons(data: unknown): Hackathon[] {
  if (Array.isArray(data)) return data as Hackathon[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.hackathons)) return obj.hackathons as Hackathon[];
    if (Array.isArray(obj.items)) return obj.items as Hackathon[];
  }
  return [];
}

export const CurrentHackathonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, idToken } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [currentHackathonId, setCurrentHackathonIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCurrentHackathonId = useCallback((id: string | null) => {
    setCurrentHackathonIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/hackathons`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const list = extractHackathons(response.data);
      setHackathons(list);

      // Reconcile the selected hackathon with the fetched list.
      setCurrentHackathonIdState((prev) => {
        const stored = prev || localStorage.getItem(STORAGE_KEY);
        const storedIsValid = stored && list.some((h) => h.hackathon_id === stored);
        if (storedIsValid) return stored;
        // Auto-select if exactly one hackathon is available.
        if (list.length === 1) {
          localStorage.setItem(STORAGE_KEY, list[0].hackathon_id);
          return list[0].hackathon_id;
        }
        // Stored id no longer valid — clear it.
        if (stored && !storedIsValid) {
          localStorage.removeItem(STORAGE_KEY);
        }
        return storedIsValid ? stored : null;
      });
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'Failed to load hackathons.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (isAuthenticated && idToken) {
      void refresh();
    }
  }, [isAuthenticated, idToken, refresh]);

  const currentHackathon =
    hackathons.find((h) => h.hackathon_id === currentHackathonId) || null;

  const value: CurrentHackathonContextType = {
    hackathons,
    currentHackathon,
    currentHackathonId,
    setCurrentHackathonId,
    loading,
    error,
    refresh,
  };

  return (
    <CurrentHackathonContext.Provider value={value}>{children}</CurrentHackathonContext.Provider>
  );
};
