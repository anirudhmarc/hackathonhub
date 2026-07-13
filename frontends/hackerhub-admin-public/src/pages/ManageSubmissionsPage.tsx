import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentHackathon } from '@/contexts/CurrentHackathonContext';
import NoHackathonSelected from '@/components/NoHackathonSelected';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Loader2,
  RefreshCw,
  Download,
  Video as VideoIcon,
  FileText,
  Github,
  ExternalLink,
  FileX,
  Hash,
  Clock,
} from 'lucide-react';
import axios, { isAxiosError } from 'axios';

interface Submission {
  submission_id?: string;
  video_url?: string | null;
  github_url?: string | null;
  project_description?: string | null;
  additional_materials?: string[];
  last_updated?: string | null;
}

interface Team {
  id: string;
  name: string;
  track_name?: string;
  problem_title?: string;
  is_finalist?: boolean;
  has_submitted?: boolean;
  submission?: Submission | null;
}

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;

// A stored video URL may be the "no video" placeholder; treat it as no video.
const isPlaceholderVideo = (url?: string | null): boolean => {
  if (!url) return true;
  return url.includes('placeholder') || url.includes('no-video-uploaded');
};

const fileNameFromUrl = (url: string): string => {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').pop() || 'file';
    return decodeURIComponent(last);
  } catch {
    return decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'file');
  }
};

const ManageSubmissionsPage: React.FC = () => {
  const { idToken } = useAuth();
  const { currentHackathonId } = useCurrentHackathon();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [onlySubmitted, setOnlySubmitted] = useState(true);

  const fetchData = async () => {
    if (!idToken || !currentHackathonId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/leaderboard`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const fetched: Team[] = response.data?.teams || [];
      // Sort: submitted first, then by name.
      fetched.sort((a, b) => {
        if (!!b.has_submitted !== !!a.has_submitted) return b.has_submitted ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
      setTeams(fetched);
    } catch (err) {
      const msg = isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'Failed to fetch submissions.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken, currentHackathonId]);

  const filteredTeams = useMemo(() => {
    let result = teams;
    if (onlySubmitted) result = result.filter((t) => t.has_submitted);
    const q = search.trim().toLowerCase();
    if (q) result = result.filter((t) => t.name.toLowerCase().includes(q));
    return result;
  }, [teams, search, onlySubmitted]);

  const submittedCount = useMemo(() => teams.filter((t) => t.has_submitted).length, [teams]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Singapore', timeZoneName: 'short',
      });
    } catch {
      return iso;
    }
  };

  if (!currentHackathonId) {
    return <NoHackathonSelected />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-600">Loading submissions…</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Submissions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {submittedCount} of {teams.length} teams submitted. Preview and download videos & materials.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} className="w-full md:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by team name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={onlySubmitted ? 'default' : 'outline'}
          onClick={() => setOnlySubmitted((s) => !s)}
        >
          {onlySubmitted ? 'Showing submitted only' : 'Showing all teams'}
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchData}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <FileX className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            No submissions match your filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {filteredTeams.map((team) => {
            const sub = team.submission;
            const hasVideo = sub?.video_url && !isPlaceholderVideo(sub.video_url);
            const materials = sub?.additional_materials || [];
            return (
              <Card key={team.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {team.name}
                        {team.is_finalist && <Badge className="bg-yellow-500">Finalist</Badge>}
                        {!team.has_submitted && <Badge variant="outline" className="text-gray-500">No submission</Badge>}
                      </CardTitle>
                      {sub?.last_updated && (
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" /> Last updated {formatDate(sub.last_updated)}
                        </CardDescription>
                      )}
                    </div>
                    {sub?.submission_id && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Hash className="h-3 w-3" />{sub.submission_id}
                      </span>
                    )}
                  </div>
                </CardHeader>

                {team.has_submitted && sub ? (
                  <CardContent className="space-y-4">
                    {/* Video */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                          <VideoIcon className="h-4 w-4" /> Demo Video
                        </span>
                        {hasVideo && (
                          <a href={sub.video_url!} download>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1.5" /> Download
                            </Button>
                          </a>
                        )}
                      </div>
                      {hasVideo ? (
                        <video
                          src={sub.video_url!}
                          controls
                          preload="metadata"
                          className="w-full max-w-2xl rounded-lg border border-gray-200 bg-black aspect-video"
                        />
                      ) : (
                        <p className="text-sm text-gray-400 italic">No video uploaded.</p>
                      )}
                    </div>

                    {/* Repository */}
                    <div className="flex items-center gap-2 text-sm">
                      <Github className="h-4 w-4 text-gray-700" />
                      {sub.github_url && sub.github_url.trim() !== '' && sub.github_url.trim() !== '-' ? (
                        <a
                          href={sub.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline break-all inline-flex items-center gap-1"
                        >
                          {sub.github_url} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400">No repository provided</span>
                      )}
                    </div>

                    {/* Additional materials */}
                    <div>
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                        <FileText className="h-4 w-4" /> Additional Materials ({materials.length})
                      </span>
                      {materials.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {materials.map((url, i) => (
                            <a key={i} href={url} download>
                              <Button size="sm" variant="outline" className="max-w-xs">
                                <Download className="h-4 w-4 mr-1.5 shrink-0" />
                                <span className="truncate">{fileNameFromUrl(url)}</span>
                              </Button>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No additional materials.</p>
                      )}
                    </div>

                    {/* Description */}
                    {sub.project_description && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Project Description</span>
                        <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-md p-3 border border-gray-100">
                          {sub.project_description}
                        </p>
                      </div>
                    )}
                  </CardContent>
                ) : (
                  <CardContent>
                    <p className="text-sm text-gray-400 italic">This team has not submitted a project.</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManageSubmissionsPage;
