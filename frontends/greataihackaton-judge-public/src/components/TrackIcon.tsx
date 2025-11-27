import React from 'react';
import { GraduationCap, Briefcase } from 'lucide-react';

interface TrackIconProps {
  track: 'student' | 'corporate';
  size?: number;
  className?: string;
}

export const TrackIcon: React.FC<TrackIconProps> = ({ 
  track, 
  size = 20, 
  className = "" 
}) => {
  if (track === 'student') {
    return (
      <div className={`bg-blue-100 text-blue-700 p-1 rounded-full ${className}`} title="Student Track">
        <GraduationCap size={size} />
      </div>
    );
  } else {
    return (
      <div className={`bg-purple-100 text-purple-700 p-1 rounded-full ${className}`} title="Corporate Track">
        <Briefcase size={size} />
      </div>
    );
  }
};
