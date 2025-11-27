// src/utils/navigationUtils.ts
import { Lock } from "lucide-react";
import { UserData } from '@/types/user';
import { User } from '@/contexts/AuthContext';

// Get dates from the environment variables
const PROBLEMS_START_DATE = new Date(import.meta.env.VITE_PROBLEMS_START_DATE);
const PROBLEMS_SELECTION_DATE = new Date(import.meta.env.VITE_PROBLEMS_SELECTION_DATE);
const SUBMISSION_START_DATE = new Date(import.meta.env.VITE_SUBMISSION_START_DATE);
const SUBMISSION_END_DATE = new Date(import.meta.env.VITE_SUBMISSION_END_DATE);
const FEEDBACK_RELEASE_DATE = new Date(import.meta.env.VITE_FEEDBACK_RELEASE_DATE);


/**
 * Checks if a navigation link should be locked.
 * @param path The path of the link (e.g., "/problems").
 * @param user The user object from the AuthContext.
 * @returns boolean True if the link should be locked, otherwise False.
 */
export const isLocked = (path: string, user: User) => {
  if (!user) return true;

  // Corporate users have access to all paths except time-restricted ones
  if (user.track === 'corporate') {
    switch (path) {
      case "/problems":
        // For corporate users, only lock if selection period ended AND they haven't selected
        return isAfterDeadline('VITE_PROBLEMS_SELECTION_END_DATE') && !user?.problemId;
      case "/submission":
        // If the user has already submitted, don't lock the submission page even if the deadline passed
        if (user?.hasSubmitted) return false;
        return isAfterDeadline('VITE_SUBMISSION_END_DATE');
      case "/feedback":
        return isBeforeDate('VITE_FEEDBACK_RELEASE_DATE');
      default:
        return false;
    }
  }

  // Student track logic with enhanced conditions
  const hasTeam = !!user?.teamName;
  const problemsAnnounced = new Date().getTime() >= PROBLEMS_START_DATE.getTime();
  const problemsSelectionOpen = new Date().getTime() >= PROBLEMS_SELECTION_DATE.getTime();
  const submissionOpen = new Date().getTime() >= SUBMISSION_START_DATE.getTime() && new Date().getTime() <= SUBMISSION_END_DATE.getTime();
  const hasSubmitted = user?.hasSubmitted || false;
  const hasSelectedProblem = !!user?.problemId;

  switch (path) {
    case "/problems":
      // Must have team, problems announced
      if (!hasTeam || !problemsAnnounced) return true;
      // Only show lock if selection time is over AND user hasn't selected a problem
      if (isAfterDeadline('VITE_PROBLEMS_SELECTION_END_DATE') && !hasSelectedProblem) return true;
      return false;
      
    case "/submission":
      // If the user has already submitted, don't lock access to submission (they should see their submission / completed state)
      if (hasSubmitted) return false;
      // Must have team, selected problem, submission period open, AND respect submission deadline
      if (!hasTeam || !hasSelectedProblem || !submissionOpen) return true;
      return isAfterDeadline('VITE_SUBMISSION_END_DATE');
      
    case "/feedback":
      // Must have team, submitted something, AND feedback must be released
      if (!hasTeam || !hasSubmitted) return true;
      const feedbackReleased = new Date().getTime() >= FEEDBACK_RELEASE_DATE.getTime();
      return !feedbackReleased;
      
    default:
      return false;
  }
};

// Helper function to check if current time is after a deadline
function isAfterDeadline(envVar: string): boolean {
  const deadlineStr = import.meta.env[envVar];
  if (!deadlineStr) return false;
  
  try {
    const deadline = new Date(deadlineStr);
    return new Date() > deadline;
  } catch {
    return false;
  }
}

// Helper function to check if current time is before a start date
function isBeforeDate(envVar: string): boolean {
  const dateStr = import.meta.env[envVar];
  if (!dateStr) return false;
  
  try {
    const startDate = new Date(dateStr);
    return new Date() < startDate;
  } catch {
    return false;
  }
}

/**
 * Gets the reason why a navigation link is locked for better UX.
 * @param path The path of the link (e.g., "/problems").
 * @param user The user object from the AuthContext.
 * @returns string|null The reason for being locked, or null if not locked.
 */
export function getLockReason(path: string, user: User | null): string | null {
  if (!user) return "Please log in to access this feature";
  
  if (user.track === 'corporate') {
    switch (path) {
      case "/problems":
        return (isAfterDeadline('VITE_PROBLEMS_SELECTION_END_DATE') && !user?.problemId) ? "Problem selection period has ended" : null;
      case "/submission":
        return isAfterDeadline('VITE_SUBMISSION_END_DATE') ? "Submission deadline has passed" : null;
      case "/feedback":
        return isBeforeDate('VITE_FEEDBACK_RELEASE_DATE') ? "Feedback will be available after judging" : null;
      default:
        return null;
    }
  }

  // Student track logic
  const hasTeam = !!user?.teamName;
  const problemsAnnounced = new Date().getTime() >= PROBLEMS_START_DATE.getTime();
  const submissionOpen = new Date().getTime() >= SUBMISSION_START_DATE.getTime() && new Date().getTime() <= SUBMISSION_END_DATE.getTime();
  const hasSubmitted = user?.hasSubmitted || false;
  const hasSelectedProblem = !!user?.problemId;
  const feedbackReleased = new Date().getTime() >= FEEDBACK_RELEASE_DATE.getTime();

  switch (path) {
    case "/problems":
      if (!hasTeam) return "Join a team to access problem statements";
      if (!problemsAnnounced) return "Problem statements will be announced soon";
      if (isAfterDeadline('VITE_PROBLEMS_SELECTION_END_DATE') && !hasSelectedProblem) return "Problem selection period has ended";
      return null;
      
    case "/submission":
      // If the user has already submitted, don't provide a lock reason
      if (hasSubmitted) return null;
      if (!hasTeam) return "Join a team to submit your project";
      if (!hasSelectedProblem) return "Select a problem statement first";
      if (!submissionOpen) return "Submission period is not yet open";
      if (isAfterDeadline('VITE_SUBMISSION_END_DATE')) return "Submission deadline has passed";
      return null;
      
    case "/feedback":
      if (!hasTeam) return "Join a team to view feedback";
      if (!hasSubmitted) return "Submit your project to receive feedback";
      if (!feedbackReleased) return "Feedback will be available after judging";
      return null;
      
    default:
      return null;
  }
}