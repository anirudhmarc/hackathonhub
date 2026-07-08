import axios from "axios";

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;

// Shared axios instance for all platform + participant calls.
export const apiClient = axios.create({
  baseURL: API_GATEWAY_BASE_URL,
});

/**
 * Build a fully-qualified URL for a hackathon-scoped participant endpoint.
 *
 * @param hackathonId The current tenant's hackathon id (must be non-empty).
 * @param path        A path *relative to* the participant namespace, e.g.
 *                    "teams", "/submissions", "submission-urls".
 * @returns e.g. `${API}/hackathons/{id}/participant/teams`
 */
export const buildUrl = (hackathonId: string, path: string): string => {
  if (!hackathonId) {
    throw new Error("buildUrl called without a hackathonId");
  }
  const clean = path.replace(/^\/+/, "");
  return `${API_GATEWAY_BASE_URL}/hackathons/${encodeURIComponent(
    hackathonId
  )}/participant/${clean}`;
};

// Platform-level (non-nested) endpoint listing the hackathons the participant
// has membership in.
export const hackathonsUrl = (): string => `${API_GATEWAY_BASE_URL}/hackathons`;

// Single hackathon record (carries the timeline fields).
export const hackathonUrl = (hackathonId: string): string =>
  `${API_GATEWAY_BASE_URL}/hackathons/${encodeURIComponent(hackathonId)}`;

// Standard auth header used across the app.
export const authHeaders = (idToken: string) => ({
  Authorization: `Bearer ${idToken}`,
});
