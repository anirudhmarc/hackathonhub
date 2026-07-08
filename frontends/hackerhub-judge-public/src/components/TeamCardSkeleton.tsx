import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const TeamCardSkeleton: React.FC = () => {
  return (
    <div className="w-full border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-8 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </div>
    </div>
  );
};

export const LoadingTeamsList: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, i) => (
        <TeamCardSkeleton key={i} />
      ))}
    </div>
  );
};