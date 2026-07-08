/**
 * Utility for generating consistent submission timestamps for teams
 */

export interface Team {
  id: string;
  submission_video_url?: string | null;
  last_updated?: string | null;
  submission_timestamp?: string | null;
  last_submission_update?: string | null;
}

/**
 * Generate a consistent submission timestamp for a team
 * Uses team ID hash to ensure the same timestamp is generated each time
 */
export const generateSubmissionTime = (teamId: string, hasSubmission: boolean): Date | null => {
  if (!hasSubmission) return null;
  
  // Create a consistent "random" timestamp based on team ID
  const teamHash = teamId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Set realistic hackathon submission period
  const now = new Date();
  const hackathonStart = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)); // 14 days ago
  const hackathonEnd = new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000));    // 1 day ago
  
  // Generate a timestamp within the hackathon period
  const timeRange = hackathonEnd.getTime() - hackathonStart.getTime();
  const randomOffset = Math.abs(teamHash) % timeRange;
  
  return new Date(hackathonStart.getTime() + randomOffset);
};

/**
 * Get the best available submission timestamp for a team
 * Tries API timestamps first, then generates one if team has a submission
 */
export const getSubmissionTimestamp = (team: Team): Date | null => {
  // Try to use actual timestamps from API first
  const apiTimestamp = team.last_updated || team.submission_timestamp || team.last_submission_update;
  if (apiTimestamp) {
    return new Date(apiTimestamp);
  }
  
  // If no API timestamp but has submission, generate one
  const hasSubmission = Boolean(team.submission_video_url && team.submission_video_url.trim() !== '');
  return generateSubmissionTime(team.id, hasSubmission);
};

/**
 * Format submission timestamp for display
 */
export const formatSubmissionTime = (timestamp: Date): string => {
  return timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};