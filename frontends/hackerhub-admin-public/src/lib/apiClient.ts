import axios, { type AxiosRequestConfig } from 'axios';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentHackathon } from '@/contexts/CurrentHackathonContext';

/**
 * Shared axios instance for the admin app. Multi-tenant: admin endpoints are
 * nested under `/hackathons/{hackathonId}/admin/...`. Platform endpoints such
 * as `/hackathons` are NOT tenant-scoped.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

/** Build a tenant-scoped admin URL, e.g. buildAdminUrl(id, '/teams') -> `${base}/hackathons/{id}/admin/teams`. */
export function buildAdminUrl(hackathonId: string, path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}/hackathons/${hackathonId}/admin${suffix}`;
}

/** Build a tenant-scoped base URL (without the trailing `/admin`). */
export function buildHackathonBase(hackathonId: string): string {
  return `${API_BASE_URL}/hackathons/${hackathonId}`;
}

function authHeaders(idToken?: string): Record<string, string> {
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}

/**
 * Hook returning API methods bound to the current idToken and currentHackathonId.
 *
 * - admin* methods prefix `/hackathons/{currentHackathonId}/admin` and require a
 *   selected hackathon (they throw if none is selected).
 * - platform* methods hit un-nested `/hackathons` endpoints.
 */
export function useApi() {
  const { idToken } = useAuth();
  const { currentHackathonId } = useCurrentHackathon();

  return useMemo(() => {
    const headers = authHeaders(idToken);

    const requireTenant = (): string => {
      if (!currentHackathonId) {
        throw new Error('No hackathon selected. Select or create a hackathon first.');
      }
      return currentHackathonId;
    };

    const adminUrl = (path: string) => buildAdminUrl(requireTenant(), path);

    return {
      idToken,
      currentHackathonId,
      hasHackathon: Boolean(currentHackathonId),

      // Tenant-scoped admin calls
      adminGet: (path: string, config?: AxiosRequestConfig) =>
        apiClient.get(adminUrl(path), { ...config, headers: { ...headers, ...(config?.headers || {}) } }),
      adminPost: (path: string, body?: unknown, config?: AxiosRequestConfig) =>
        apiClient.post(adminUrl(path), body, { ...config, headers: { ...headers, ...(config?.headers || {}) } }),
      adminPut: (path: string, body?: unknown, config?: AxiosRequestConfig) =>
        apiClient.put(adminUrl(path), body, { ...config, headers: { ...headers, ...(config?.headers || {}) } }),
      adminDelete: (path: string, config?: AxiosRequestConfig) =>
        apiClient.delete(adminUrl(path), { ...config, headers: { ...headers, ...(config?.headers || {}) } }),

      // Platform (non-tenant) calls
      platformGet: (path: string, config?: AxiosRequestConfig) =>
        apiClient.get(path, { ...config, headers: { ...headers, ...(config?.headers || {}) } }),
      platformPost: (path: string, body?: unknown, config?: AxiosRequestConfig) =>
        apiClient.post(path, body, { ...config, headers: { ...headers, ...(config?.headers || {}) } }),
      platformPut: (path: string, body?: unknown, config?: AxiosRequestConfig) =>
        apiClient.put(path, body, { ...config, headers: { ...headers, ...(config?.headers || {}) } }),
    };
  }, [idToken, currentHackathonId]);
}
