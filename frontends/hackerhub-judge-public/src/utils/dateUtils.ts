/**
 * Utility functions for date and time formatting
 */

export const formatSubmissionTimestamp = (timestamp: string | null | undefined): string => {
  if (!timestamp) return 'Not submitted';
  
  try {
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid date';
    }
    
    // Format as "Sep 21, 5:56 PM"
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return `${dateStr}, ${timeStr}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error, timestamp);
    return 'Invalid date';
  }
};

export const formatSubmissionTimestampFull = (timestamp: string | null | undefined): string => {
  if (!timestamp) return 'Not submitted';
  
  try {
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid date';
    }
    
    // Format as "September 21, 2025 at 5:56 PM"
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error, timestamp);
    return 'Invalid date';
  }
};

export const parseTimestampForSorting = (timestamp: string | null | undefined): number => {
  if (!timestamp) return 0;
  
  try {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  } catch (error) {
    console.error('Error parsing timestamp for sorting:', error, timestamp);
    return 0;
  }
};

export const isValidTimestamp = (timestamp: string | null | undefined): boolean => {
  if (!timestamp) return false;
  
  try {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
};