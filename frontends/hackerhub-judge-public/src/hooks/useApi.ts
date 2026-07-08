import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'https://2mot27ih90.execute-api.us-east-1.amazonaws.com/Test-Stage';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  queryParams?: Record<string, string | number>;
  headers?: Record<string, string>;
}

interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

export function useApi<T>(endpoint: string, options: ApiOptions = {}) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const buildUrl = useCallback(() => {
    let url = `${API_BASE_URL}${endpoint}`;
    
    if (options.queryParams && Object.keys(options.queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(options.queryParams).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      url = `${url}?${params.toString()}`;
    }
    
    return url;
  }, [endpoint, options.queryParams]);

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const url = buildUrl();
      console.log(`Fetching from: ${url}`);
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setState({ data, isLoading: false, error: null });
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      setState({ data: null, isLoading: false, error: error as Error });
      throw error;
    }
  }, [buildUrl, options.method, options.body, options.headers]);

  useEffect(() => {
    if (!options.method || options.method === 'GET') {
      fetchData();
    }
  }, [fetchData, options.method]);

  return {
    ...state,
    refetch: fetchData,
    mutate: async (newData: Partial<T>) => {
      setState(prev => ({
        ...prev,
        data: prev.data ? { ...prev.data, ...newData } as T : newData as T,
      }));
    },
  };
}

export default useApi;
