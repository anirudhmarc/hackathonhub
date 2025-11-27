import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Welcome: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-gray-200 text-center">
        <div className="text-center mb-8">
          <img src="/aws-logo.png" alt="AWS Logo" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Malaysia AI Hackathon</h1>
          <p className="text-gray-600">AWS Hackhub</p>
        </div>
        <div className="space-y-6">
        <p className="text-gray-700">You have been logged out. Welcome back!</p>
        <Button asChild className="w-full py-6 text-lg">
          <Link to="/login">
            <span>Sign In</span>
          </Link>
        </Button>
      </div>
      </div>
    </div>
  );
};

export default Welcome;