/**
 * Scoring DateTime Control Utility
 * Controls when scoring functionality is available based on environment variables
 */

export interface ScoringTimeStatus {
  isEnabled: boolean;
  canScore: boolean;
  message: string;
  status: 'before' | 'active' | 'locked' | 'disabled';
  startDate?: Date;
  lockDate?: Date;
}

/**
 * Check if scoring is currently allowed based on datetime controls
 */
export const getScoringTimeStatus = (): ScoringTimeStatus => {
  const isDateTimeControlEnabled = import.meta.env.VITE_ENABLE_SCORING_DATETIME_CONTROL === '1';
  
  if (!isDateTimeControlEnabled) {
    return {
      isEnabled: false,
      canScore: true,
      message: "Scoring is available (no datetime restrictions)",
      status: 'active'
    };
  }

  const startDateStr = import.meta.env.VITE_SCORING_START_DATE;
  const lockDateStr = import.meta.env.VITE_SCORING_LOCK_DATE;
  
  if (!startDateStr || !lockDateStr) {
    console.warn('Scoring datetime control is enabled but dates are not configured properly');
    return {
      isEnabled: true,
      canScore: true,
      message: "Scoring is available (configuration incomplete)",
      status: 'active'
    };
  }

  const now = new Date();
  const startDate = new Date(startDateStr);
  const lockDate = new Date(lockDateStr);

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(lockDate.getTime())) {
    console.error('Invalid scoring dates configured');
    return {
      isEnabled: true,
      canScore: true,
      message: "Scoring is available (invalid date configuration)",
      status: 'active'
    };
  }

  if (now < startDate) {
    return {
      isEnabled: true,
      canScore: false,
      message: `Scoring will open on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}`,
      status: 'before',
      startDate,
      lockDate
    };
  }

  if (now > lockDate) {
    return {
      isEnabled: true,
      canScore: false,
      message: `Scoring period ended on ${lockDate.toLocaleDateString()} at ${lockDate.toLocaleTimeString()}`,
      status: 'locked',
      startDate,
      lockDate
    };
  }

  return {
    isEnabled: true,
    canScore: true,
    message: `Scoring is open until ${lockDate.toLocaleDateString()} at ${lockDate.toLocaleTimeString()}`,
    status: 'active',
    startDate,
    lockDate
  };
};

/**
 * Format remaining time until scoring starts or ends
 */
export const getTimeUntilStatusChange = (status: ScoringTimeStatus): string | null => {
  if (!status.isEnabled || status.status === 'locked' || status.status === 'disabled') {
    return null;
  }

  const now = new Date();
  let targetDate: Date;

  if (status.status === 'before' && status.startDate) {
    targetDate = status.startDate;
  } else if (status.status === 'active' && status.lockDate) {
    targetDate = status.lockDate;
  } else {
    return null;
  }

  const diffMs = targetDate.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return null;
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

/**
 * Check if current time is within scoring window
 */
export const isScoringActive = (): boolean => {
  const status = getScoringTimeStatus();
  return status.canScore;
};