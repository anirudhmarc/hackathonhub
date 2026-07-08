import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, LayoutList } from 'lucide-react';

/**
 * Empty state shown on management pages when no hackathon is selected.
 * Multi-tenant admin data requires an active hackathon context.
 */
const NoHackathonSelected: React.FC = () => (
  <div className="w-full max-w-2xl mx-auto py-16">
    <Card>
      <CardContent className="p-10 text-center">
        <LayoutList className="h-10 w-10 mx-auto mb-4 text-indigo-500" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Select or create a hackathon</h2>
        <p className="text-gray-500 mb-6">
          Choose a hackathon from the selector in the top bar, or create one to start managing it.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/hackathons">
              <LayoutList className="h-4 w-4 mr-2" /> View Hackathons
            </Link>
          </Button>
          <Button asChild>
            <Link to="/hackathons/new">
              <PlusCircle className="h-4 w-4 mr-2" /> Create Hackathon
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default NoHackathonSelected;
