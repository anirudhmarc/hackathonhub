import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-800 p-4">
      <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
      <p className="text-lg mb-6">You do not have the necessary permissions to view this page.</p>
      <Button asChild>
        <Link to="/">Go to Dashboard</Link>
      </Button>
    </div>
  );
};

export default UnauthorizedPage;