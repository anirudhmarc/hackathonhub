// Timeline fields carried on each hackathon record returned by
// GET /hackathons and GET /hackathons/{id}. All are ISO-8601 date strings
// (or null when not yet configured by the host).
export interface HackathonTimeline {
  submission_start: string | null;
  submission_end: string | null;
  final_submission_start: string | null;
  final_submission_end: string | null;
  scoring_start: string | null;
  scoring_end: string | null;
  scoring_lock: string | null;
  problems_selection_start: string | null;
  problems_selection_end: string | null;
  feedback_release: string | null;
  finalists_announcement: string | null;
  winners_announcement: string | null;
  is_problem_statement_selection_enabled: boolean;
  is_team_submission_enabled: boolean;
}

// A single hackathon the participant has membership in.
export interface Hackathon extends Partial<HackathonTimeline> {
  hackathon_id: string;
  name?: string | null;
  // Some deployments return the display name under different keys; keep them
  // optional so the selector can fall back gracefully.
  hackathon_name?: string | null;
  title?: string | null;
  logo_url?: string | null;
}

// Convenience helper: get a human-readable label for a hackathon.
export const getHackathonLabel = (h: Hackathon): string =>
  h.name || h.hackathon_name || h.title || h.hackathon_id;
