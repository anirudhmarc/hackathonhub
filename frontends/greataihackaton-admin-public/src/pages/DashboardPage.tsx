import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-white flex items-start justify-center pt-16">
      <div className="text-center p-8 w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-900">Welcome to Admin System</h1>
        <p className="mt-2 text-gray-600">Manage the hackathon participants, teams, judges, and leaderboards</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button asChild variant="outline" className="w-full">
            <Link to="/participants">Participants</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/teams">Teams</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/judges">Judges</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/problems">Problems</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/assignments">Assignments</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/leaderboard">Leaderboards</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;