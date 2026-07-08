/**
 * Judge Access Control Utilities
 * 
 * This module provides utilities to control judge access to scoring data
 * and leaderboards based on their team assignments and environment settings.
 */

import { Team, JudgingStage, Judge } from '../services/api';

/**
 * Check if a judge has assigned teams in the final round
 */
export function judgeHasFinalistTeams(
  judge: Judge | null,
  assignedTeams: Team[],
  currentStage: JudgingStage | null
): boolean {
  if (!judge || !assignedTeams || !currentStage) return true;
  
  // Only apply restriction in Final Round
  if (currentStage.stage_name === 'Final Round') {
    const finalistTeams = assignedTeams.filter(team => team.is_finalist === true);
    return finalistTeams.length > 0;
  }
  
  // For other stages, always allow access
  return true;
}

/**
 * Check if leaderboard should be locked for judges without final round teams
 */
export function shouldLockLeaderboardForJudge(
  judge: Judge | null,
  assignedTeams: Team[],
  currentStage: JudgingStage | null
): boolean {
  return false;
}

/**
 * Check if judge should have access to score data
 */
export function judgeHasScoreAccess(
  judge: Judge | null,
  assignedTeams: Team[],
  currentStage: JudgingStage | null
): boolean {
  return !shouldLockLeaderboardForJudge(judge, assignedTeams, currentStage);
}

/**
 * Silent access check - returns false without any indication to the judge
 * Used for API calls and data fetching where we want to silently prevent access
 */
export function silentScoreAccessCheck(
  judge: Judge | null,
  assignedTeams: Team[],
  currentStage: JudgingStage | null
): boolean {
  return judgeHasScoreAccess(judge, assignedTeams, currentStage);
}