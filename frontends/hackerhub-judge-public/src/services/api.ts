import axios from 'axios';
import { useQuery } from 'react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface ProblemStatement {
  id: string;
  name: string;
  problem_description?: string;
  problem_tag?: string;
  problem_max_slots?: number;
  track_id?: string;
}

export interface Team {
  id: string;
  name: string;
  team_number?: string;
  last_updated?: string;
  submission_group?: string;
  track: string;
  members?: TeamMember[];
  problem_id: string | null;
  problem_statement: string | null;
  submission_video_url?: string | null;
  submission_project_description?: string | null;
  github_url?: string | null;
  submission_additional_materials_url?: string | null;
  is_finalist?: boolean;
}

export interface TeamMember {
  id: string;
  team_id: string;
  name: string;
}

export interface Judge {
  id: string;
  name: string;
  email?: string;
}

export interface JudgingStage {
  stage_id: string;
  stage_name: string;
  description?: string;
  start_time?: string;
  end_time?: string;
}

export interface Score {
  id?: string;
  team_id: string;
  judge_id: string;
  innovation: number;
  technical_complexity: number;
  impact: number;
  presentation: number;
  feedback?: string;
  strength?: string;
  improvement?: string;
  last_updated?: string;
  stage_id: string;
}

export interface TeamRanking extends Team {
  total_score: number;
  avg_innovation: number;
  avg_technical_complexity: number;
  avg_impact: number;
  avg_presentation: number;
  judge_count: number;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export interface Hackathon {
  id: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
}

// Module-level "current hackathon" id. Set by CurrentHackathonContext so the
// apiService methods (and cache keys) can be namespaced per hackathon. Kept in
// sync with localStorage so it survives page reloads before the context mounts.
const CURRENT_HACKATHON_STORAGE_KEY = 'currentHackathonId';

let currentHackathonId: string | null =
  (() => {
    try {
      return localStorage.getItem(CURRENT_HACKATHON_STORAGE_KEY);
    } catch {
      return null;
    }
  })();

export const setCurrentHackathonId = (id: string | null): void => {
  currentHackathonId = id;
  try {
    if (id) {
      localStorage.setItem(CURRENT_HACKATHON_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_HACKATHON_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
};

export const getCurrentHackathonId = (): string | null => currentHackathonId;

// Base path for all judge endpoints, scoped to the current hackathon.
const judgeBase = (): string => `/hackathons/${currentHackathonId}/judge`;

// Namespaces a cache/query key by the current hackathon id so data from
// different hackathons never bleeds into one another.
const nsKey = (key: string): string => `${currentHackathonId ?? 'none'}:${key}`;

interface QueryOptions {
  noCache?: boolean;
  cacheTimeout?: number;
}

const CACHE_SIZE_LIMIT = 50;
const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000;

const getCacheKey = (key: string) => `cache_${key}`;
const getCacheTimeKey = (key: string) => `cache_time_${key}`;

const isCacheValid = (key: string, timeout: number = DEFAULT_CACHE_TIMEOUT): boolean => {
  const cacheTime = localStorage.getItem(getCacheTimeKey(key));
  if (!cacheTime) return false;
  
  const age = Date.now() - parseInt(cacheTime);
  return age < timeout;
};

const setCacheData = (key: string, data: unknown): void => {
  try {
    const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
    if (cacheKeys.length >= CACHE_SIZE_LIMIT) {
      const entries = cacheKeys
        .filter(k => k.includes('cache_time_'))
        .map(k => ({
          key: k.replace('cache_time_', ''),
          time: parseInt(localStorage.getItem(k) || '0')
        }))
        .sort((a, b) => a.time - b.time);
      
      const toRemove = entries.slice(0, 10);
      toRemove.forEach(entry => {
        localStorage.removeItem(getCacheKey(entry.key));
        localStorage.removeItem(getCacheTimeKey(entry.key));
      });
    }
    
    localStorage.setItem(getCacheKey(key), JSON.stringify(data));
    localStorage.setItem(getCacheTimeKey(key), Date.now().toString());
  } catch (error) {
  }
};

const getCacheData = (key: string): unknown => {
  try {
    const cached = localStorage.getItem(getCacheKey(key));
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
};

const createQueryFn = (queryKey: string, apiCall: () => Promise<any>, options: QueryOptions = {}) => async () => {
  const { noCache = false, cacheTimeout = DEFAULT_CACHE_TIMEOUT } = options;
  
  if (!noCache && isCacheValid(queryKey, cacheTimeout)) {
    const cachedData = getCacheData(queryKey);
    if (cachedData) {
      return cachedData;
    }
  }
  
  const response = await apiCall();
  
  if (!noCache) {
    setCacheData(queryKey, response.data);
  }
  
  return response.data;
};

api.interceptors.request.use(
  (config) => {
    const idToken = sessionStorage.getItem('id_token');
    if (idToken) {
      config.headers.Authorization = `Bearer ${idToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = sessionStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          return Promise.resolve({ data: [] });
        }
        
        const cognitoDomain = import.meta.env.VITE_ADMIN_COGNITO_AUTH_DOMAIN;
        const clientId = import.meta.env.VITE_ADMIN_COGNITO_CLIENT_ID;

        const tokenEndpoint = `${cognitoDomain}/oauth2/token`;
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('client_id', clientId);
        params.append('refresh_token', refreshToken);
        
        const response = await axios.post(tokenEndpoint, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        sessionStorage.setItem('access_token', response.data.access_token);
        sessionStorage.setItem('id_token', response.data.id_token);
        
        originalRequest.headers.Authorization = `Bearer ${response.data.id_token}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('id_token');
        sessionStorage.removeItem('refresh_token');
        return Promise.resolve({ data: [] });
      }
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      return Promise.resolve({ data: [] });
    }
    
    return Promise.reject(error);
  }
);

export const apiService = {
  // Platform endpoint (NOT nested): lists hackathons the caller has membership in.
  getHackathons: () => api.get('/hackathons'),
  getProblemStatements: () => api.get(`${judgeBase()}/problems`),
  getJudges: () => api.get(`${judgeBase()}/judges`),
  getScores: (stageId: string) => {
    return api.get(`${judgeBase()}/scores?stage_id=${stageId}`);
  },
  getJudgingStages: () => api.get(`${judgeBase()}/stages`),
  getAllTeams: () => api.get(`${judgeBase()}/teams`),
  getAssignedTeams: (judgeId: string, stageId: string) =>
    api.get(`${judgeBase()}/assignments/${judgeId}/teams?stage_id=${stageId}`),
  submitScore: (scoreData: Record<string, unknown>) => api.post(`${judgeBase()}/scores`, scoreData),
  createJudge: (name: string, email?: string) => api.post(`${judgeBase()}/judges`, { name, email }),
};

export const useJudgingStages = (enabled: boolean) => {
  const cacheOptions = { cacheTimeout: 60 * 60 * 1000 };
  const cacheKey = nsKey('judgingStages');

  return useQuery<JudgingStage[], Error>(
    cacheKey,
    createQueryFn(cacheKey, apiService.getJudgingStages, cacheOptions),
    {
      retry: 1,
      retryDelay: 1000,
      onError: () => [],
      enabled: enabled,
      staleTime: Infinity
    }
  );
};

export const useProblemStatements = (enabled: boolean) => {
  const cacheOptions = { cacheTimeout: 60 * 60 * 1000 };
  const cacheKey = nsKey('problemStatements');

  return useQuery<ProblemStatement[], Error>(
    cacheKey,
    createQueryFn(cacheKey, apiService.getProblemStatements, cacheOptions),
    {
      retry: 1,
      retryDelay: 1000,
      onError: () => [],
      enabled: enabled,
      staleTime: Infinity
    }
  );
};

export const useTeams = (judgeId: string | null, stageId: string | null, enabled: boolean, options: QueryOptions = {}) => {
  const queryKey = judgeId && stageId ? nsKey(`assignedTeams-${judgeId}-${stageId}`) : nsKey('allTeams');
  const apiCall = judgeId && stageId ? () => apiService.getAssignedTeams(judgeId, stageId) : apiService.getAllTeams;

  const cacheOptions = { ...options, cacheTimeout: 60 * 60 * 1000 };

  return useQuery<Team[], Error>(
    queryKey,
    createQueryFn(queryKey, apiCall, cacheOptions),
    {
      retry: 1,
      retryDelay: 1000,
      onError: () => [],
      enabled: enabled,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useJudges = (enabled: boolean, options: QueryOptions = {}) => {
  const cacheOptions = { ...options, cacheTimeout: 30 * 60 * 1000 };
  const cacheKey = nsKey('judges');

  return useQuery<Judge[], Error>(
    cacheKey,
    createQueryFn(cacheKey, apiService.getJudges, cacheOptions),
    {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error) => {
        if (import.meta.env.DEV) {
        }
      },
      enabled: enabled,
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      placeholderData: [],
      keepPreviousData: true
    }
  );
};

export const useScores = (stageId: string | null, enabled: boolean) => {
  const cacheOptions = { cacheTimeout: 5 * 60 * 1000 };
  const cacheKey = nsKey(`scores-${stageId}`);

  return useQuery<Score[], Error>(
    [nsKey('scores'), stageId],
    createQueryFn(cacheKey, () => apiService.getScores(stageId!), cacheOptions),
    {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      onError: (error) => {
        return [];
      },
      enabled: enabled && !!stageId,
      staleTime: 0,
      cacheTime: 0,
      placeholderData: [],
      keepPreviousData: true
    }
  );
};

export const submitScore = (
  teamId: string,
  judgeId: string,
  innovation: number,
  technicalComplexity: number,
  impact: number,
  presentation: number,
  feedback: string,
  strength: string,
  improvement: string,
  isUpdate: boolean = false,
  stageId: string
) => {
  const scoreData = {
    team_id: teamId,
    judge_id: judgeId,
    innovation,
    technical_complexity: technicalComplexity,
    impact,
    presentation,
    feedback,
    strength,
    improvement,
    stage_id: stageId
  };

  // PostJudgeScores upserts (insert-or-update) on POST, and the API only exposes
  // POST on /judge/scores — so always POST. `isUpdate` is kept for call-site
  // compatibility but no longer switches the HTTP verb (PUT is not routed and
  // would 403 at the edge).
  void isUpdate;

  return {
    scoreData,
    submit: async () => {
      try {
        const response = await api({
          url: `${judgeBase()}/scores`,
          method: 'post',
          data: scoreData,
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    }
  };
};

export const createJudge = (name: string, email?: string) => {
  const createJudgeRequest = async () => {
    try {
      const response = await apiService.createJudge(name, email);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  return {
    request: createJudgeRequest,
    refetch: createJudgeRequest
  };
};

export default api;
