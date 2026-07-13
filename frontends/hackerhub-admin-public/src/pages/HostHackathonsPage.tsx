import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentHackathon, type Hackathon } from '@/contexts/CurrentHackathonContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function windowText(start?: string | null, end?: string | null): string {
  if (!start && !end) return '—';
  return `${formatDate(start)} → ${formatDate(end)}`;
}

const statusVariant = (status?: string | null): 'default' | 'outline' => {
  if (!status) return 'outline';
  return status.toLowerCase() === 'active' || status.toLowerCase() === 'open' ? 'default' : 'outline';
};

const HostHackathonsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    hackathons,
    currentHackathonId,
    setCurrentHackathonId,
    loading,
    error,
    refresh,
  } = useCurrentHackathon();

  const handleManage = (h: Hackathon) => {
    setCurrentHackathonId(h.hackathon_id);
    navigate('/');
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hackathons</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the hackathons you host. Select one to make it the active hackathon.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button asChild>
            <Link to="/hackathons/new">
              <PlusCircle className="h-4 w-4 mr-2" /> Create Hackathon
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void refresh()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Hackathons</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-600">Loading hackathons…</span>
            </div>
          ) : hackathons.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">No hackathons yet.</p>
              <Button asChild>
                <Link to="/hackathons/new">
                  <PlusCircle className="h-4 w-4 mr-2" /> Create your first hackathon
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submission Window</TableHead>
                    <TableHead>Scoring Window</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hackathons.map((h) => {
                    const isActive = h.hackathon_id === currentHackathonId;
                    return (
                      <TableRow key={h.hackathon_id} className={isActive ? 'bg-indigo-50/60' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {h.name}
                            {isActive && (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Active
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(h.status)}>{h.status || 'draft'}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {windowText(h.submission_start, h.submission_end)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {windowText(h.scoring_start, h.scoring_end)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleManage(h)} disabled={isActive}>
                              {isActive ? 'Selected' : 'Manage'}
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/hackathons/${h.hackathon_id}/edit`}>Edit</Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HostHackathonsPage;
