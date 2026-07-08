/**
 * Utility functions for determining read-only mode in the judging system
 */

// Get the scoring end date from environment variables
const SCORING_END_DATE = import.meta.env.VITE_SCORING_END_DATE 
  ? new Date(String(import.meta.env.VITE_SCORING_END_DATE)) 
  : null;

/**
 * Check if the system is currently in read-only mode
 * Read-only mode is active when the scoring end date has passed
 */
export const isReadOnlyMode = (): boolean => {
  return SCORING_END_DATE && 
         !isNaN(SCORING_END_DATE.getTime()) && 
         Date.now() > SCORING_END_DATE.getTime();
};

/**
 * Stage-aware read-only check
 * Returns true only when the scoring end date has passed AND the provided stage
 * looks like a Preliminary stage. If stageName is not provided, returns false
 * to avoid accidentally blocking scoring for unknown stages (e.g. Final Round).
 */
export const isReadOnlyForStage = (stageName?: string | null): boolean => {
  if (!SCORING_END_DATE || isNaN(SCORING_END_DATE.getTime())) return false;
  if (!stageName) return false;

  const lower = stageName.toLowerCase();
  const isPreliminary = lower.includes('prelim') || lower.includes('preliminary');
  if (!isPreliminary) return false;

  return Date.now() > SCORING_END_DATE.getTime();
};

/**
 * Get the scoring end date if configured
 */
export const getScoringEndDate = (): Date | null => {
  return SCORING_END_DATE;
};

/**
 * Get a human-readable description of the read-only mode status
 */
export const getReadOnlyModeDescription = (): string => {
  if (!SCORING_END_DATE) {
    return 'No scoring end date configured';
  }
  
  if (isReadOnlyMode()) {
    return `Scoring period ended on ${SCORING_END_DATE.toLocaleDateString()}. System is in view-only mode - scores API is disabled.`;
  }
  
  return `Scoring period ends on ${SCORING_END_DATE.toLocaleDateString()}`;
};

/**
 * Format the scoring end date for display
 */
export const formatScoringEndDate = (): string => {
  if (!SCORING_END_DATE) return 'Not configured';
  
  return SCORING_END_DATE.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
};