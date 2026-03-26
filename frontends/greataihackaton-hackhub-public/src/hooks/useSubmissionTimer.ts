import { useState, useEffect } from 'react';

interface SubmissionTimerResult {
  timeLeft: string;
  submissionPeriodOpen: boolean;
}

export function useSubmissionTimer(startDate: Date, endDate: Date): SubmissionTimerResult {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [submissionPeriodOpen, setSubmissionPeriodOpen] = useState<boolean>(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      if (now < startDate) {
        const diff = startDate.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`Opens in ${days}d ${hours}h ${minutes}m ${seconds}s`);
        setSubmissionPeriodOpen(false);
      } else if (now <= endDate) {
        const diff = endDate.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s remaining`);
        setSubmissionPeriodOpen(true);
      } else {
        setTimeLeft('Submission period has ended');
        setSubmissionPeriodOpen(false);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [startDate, endDate]);

  return { timeLeft, submissionPeriodOpen };
}
