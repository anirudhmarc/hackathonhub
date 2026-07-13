// src/utils/navigationUtils.ts
import { User } from "@/contexts/AuthContext";
import { Hackathon } from "@/types/hackathon";

// Parse an ISO date string into a Date, or null if absent/invalid.
const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

interface GateDates {
  submissionStart: Date | null;
  submissionEnd: Date | null;
  feedbackRelease: Date | null;
}

// Derive the gating dates from the current hackathon's timeline fields.
const getGateDates = (hackathon: Hackathon | null): GateDates => ({
  submissionStart: parseDate(hackathon?.submission_start),
  submissionEnd: parseDate(hackathon?.submission_end),
  feedbackRelease: parseDate(hackathon?.feedback_release),
});

const isSubmissionOpen = (dates: GateDates): boolean => {
  // Without configured dates we treat the window as closed.
  if (!dates.submissionStart || !dates.submissionEnd) return false;
  const now = Date.now();
  return (
    now >= dates.submissionStart.getTime() &&
    now <= dates.submissionEnd.getTime()
  );
};

/**
 * Checks if a navigation link should be locked.
 * @param path The path of the link (e.g., "/submission").
 * @param user The user object from the AuthContext.
 * @param hackathon The current hackathon (source of timeline dates).
 * @returns boolean True if the link should be locked, otherwise False.
 */
export const isLocked = (
  path: string,
  user: User | null,
  hackathon: Hackathon | null = null
): boolean => {
  if (!user) return true;

  const dates = getGateDates(hackathon);
  const hasTeam = !!user?.teamName;
  const submissionOpen = isSubmissionOpen(dates);
  const hasSubmitted = user?.hasSubmitted || false;

  switch (path) {
    case "/problems":
      // The agenda page is always available to signed-in users.
      return false;

    case "/submission":
      // If the user has already submitted, don't lock access (they should see their submission / completed state)
      if (hasSubmitted) return false;
      // Must have a team and the submission period must be open
      if (!hasTeam || !submissionOpen) return true;
      // Extra guard: if we somehow have an end date that has passed, lock.
      return !!dates.submissionEnd && Date.now() > dates.submissionEnd.getTime();

    case "/feedback": {
      // Must have team, submitted something, AND feedback must be released
      if (!hasTeam || !hasSubmitted) return true;
      if (!dates.feedbackRelease) return true;
      const feedbackReleased = Date.now() >= dates.feedbackRelease.getTime();
      return !feedbackReleased;
    }

    default:
      return false;
  }
};

/**
 * Gets the reason why a navigation link is locked for better UX.
 * @param path The path of the link (e.g., "/submission").
 * @param user The user object from the AuthContext.
 * @param hackathon The current hackathon (source of timeline dates).
 * @returns string|null The reason for being locked, or null if not locked.
 */
export function getLockReason(
  path: string,
  user: User | null,
  hackathon: Hackathon | null = null
): string | null {
  if (!user) return "Please log in to access this feature";

  const dates = getGateDates(hackathon);
  const hasTeam = !!user?.teamName;
  const submissionOpen = isSubmissionOpen(dates);
  const hasSubmitted = user?.hasSubmitted || false;
  const feedbackReleased =
    !!dates.feedbackRelease && Date.now() >= dates.feedbackRelease.getTime();

  switch (path) {
    case "/submission":
      // If the user has already submitted, don't provide a lock reason
      if (hasSubmitted) return null;
      if (!hasTeam) return "Register a team to submit your project";
      if (!submissionOpen) return "Submission period is not yet open";
      if (dates.submissionEnd && Date.now() > dates.submissionEnd.getTime())
        return "Submission deadline has passed";
      return null;

    case "/feedback":
      if (!hasTeam) return "Register a team to view feedback";
      if (!hasSubmitted) return "Submit your project to receive feedback";
      if (!feedbackReleased) return "Feedback will be available after judging";
      return null;

    default:
      return null;
  }
}
