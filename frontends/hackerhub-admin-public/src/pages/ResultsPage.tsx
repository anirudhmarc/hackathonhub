

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentHackathon } from '@/contexts/CurrentHackathonContext';
import NoHackathonSelected from '@/components/NoHackathonSelected';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Search,
  Filter,
  X,
  Loader2,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import axios, { isAxiosError } from 'axios';

interface Team {
  id: string;
  name: string;
  track_name?: string;
  problem_id?: string;
  team_number?: number;
  is_finalist?: boolean;
  image_url?: string;
}

interface TeamWithScores extends Team {
  total_score: number;
  avg_innovation: number;
  avg_technical_complexity: number;
  avg_impact: number;
  avg_presentation: number;
  judge_count: number;
  judge_gap?: number;
  judge_gap_alert?: boolean;
}

interface Problem {
  id: string;
  title: string;
}

interface Score {
  team_id: string;
  judge_id: string;
  judge_name?: string;
  innovation: number;
  technical_complexity: number;
  impact: number;
  presentation: number;
  feedback?: string;
  strength?: string;
  improvement?: string;
  last_updated?: string;
  stage_id: string;
}

interface JudgingStage {
    stage_id: string;
    stage_name: string;
}

interface Judge {
  judge_id: string;
  judge_name: string;
}

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;

const ResultsPage: React.FC = () => {
  const { idToken } = useAuth();
  const { currentHackathonId } = useCurrentHackathon();
  const [teams, setTeams] = useState<Team[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [judgingStages, setJudgingStages] = useState<JudgingStage[]>([]);
  const [judgeMap, setJudgeMap] = useState<Record<string, string>>({});
  const [judgesList, setJudgesList] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starredTeamIds, setStarredTeamIds] = useState<Set<string>>(new Set());

  const enableSorting = false;
  const showStar = false;

  const [searchQuery, setSearchQuery] = useState('');
  const [problemFilter, setProblemFilter] = useState<string>('all');
  const [judgeFilter, setJudgeFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState('');
  const [sortBy, setSortBy] = useState<string>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set());

  

  const sortedJudges = useMemo(() => {
    return [...judgesList].sort((a, b) => a.judge_name.localeCompare(b.judge_name));
  }, [judgesList]);

  const sortedProblems = useMemo(() => {
    return [...problems].sort((a, b) => a.title.localeCompare(b.title));
  }, [problems]);

  const fetchData = async () => {
    if (!idToken || !currentHackathonId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/leaderboard`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });

      const { teams, problems, scores, judgingStages } = response.data;

      await axios.get(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/assignments`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      
      let fetchedJudges: Judge[] = [];

      if (response.data.judges && Array.isArray(response.data.judges)) {
        fetchedJudges = response.data.judges;
        setJudgesList(fetchedJudges);
      } else {
        try {
          const judgesResp = await axios.get(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/judges`, {
            headers: { 'Authorization': `Bearer ${idToken}` },
          });
          fetchedJudges = judgesResp.data || [];
          setJudgesList(fetchedJudges);
        } catch (e) {

          console.warn('Failed to fetch judges list', e);
        }
      }
      

      
      setTeams(teams);
      setProblems(problems);
      setScores(scores);
  setJudgingStages(judgingStages);

  const map: Record<string, string> = {};
  fetchedJudges.forEach((j: Judge) => { map[j.judge_id] = j.judge_name; });
  setJudgeMap(map);

      const preliminaryStage = judgingStages.find((stage: JudgingStage) => stage.stage_name.toLowerCase().includes('preliminary'));
      if (preliminaryStage) {
        setStageFilter(preliminaryStage.stage_id);
      } else if (judgingStages.length > 0) {
        setStageFilter(judgingStages[0].stage_id);
      }
    } catch (err: unknown) {
      console.error("Error fetching data:", err);
      if (isAxiosError(err)) {
        setError(err.message || "Failed to fetch data.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken, currentHackathonId]);

  const teamRankings = useMemo(() => {
    if (!teams || !scores || !stageFilter) return [];


    

  const teamsToProcess = teams;
    
    return teamsToProcess
      .map((team) => {
        const teamScores = scores.filter(
          (score) => score.team_id === team.id && score.stage_id === stageFilter
        );
        

        
        const judgeCount = teamScores.length;
        if (judgeCount === 0) {
          return {
            ...team,
            total_score: 0,
            track_name: team.track_name && team.track_name.trim() !== '' ? team.track_name : '-',
            avg_innovation: 0,
            avg_technical_complexity: 0,
            avg_impact: 0,
            avg_presentation: 0,
            judge_count: 0,
          };
        }

        const totalInnovation = teamScores.reduce((sum, score) => sum + score.innovation, 0);
        const totalTechnicalComplexity = teamScores.reduce(
          (sum, score) => sum + score.technical_complexity,
          0
        );
        const totalImpact = teamScores.reduce((sum, score) => sum + score.impact, 0);
        const totalPresentation = teamScores.reduce((sum, score) => sum + score.presentation, 0);

        const avgInnovation = totalInnovation / judgeCount;
        const avgTechnicalComplexity = totalTechnicalComplexity / judgeCount;
        const avgImpact = totalImpact / judgeCount;
        const avgPresentation = totalPresentation / judgeCount;

        const totalScore = avgInnovation + avgTechnicalComplexity + avgImpact + avgPresentation;

        let judgeGap = 0;
        let judgeGapAlert = false;
        if (teamScores.length >= 2) {
          const perJudgeTotals = teamScores.map(s => (s.innovation || 0) + (s.technical_complexity || 0) + (s.impact || 0) + (s.presentation || 0));
          const maxTotal = Math.max(...perJudgeTotals);
          const minTotal = Math.min(...perJudgeTotals);
          judgeGap = Math.abs(maxTotal - minTotal);
          judgeGapAlert = judgeGap > 20; 
        }

        return {
          ...team,
          total_score: totalScore,
          avg_innovation: avgInnovation,
          avg_technical_complexity: avgTechnicalComplexity,
          avg_impact: avgImpact,
          avg_presentation: avgPresentation,
          judge_count: judgeCount,
          judge_gap: judgeGap,
          judge_gap_alert: judgeGapAlert,
          track_name: team.track_name && team.track_name.trim() !== '' ? team.track_name : '-',
        };
      })
      .sort((a, b) => b.total_score - a.total_score);
  }, [teams, scores, stageFilter, judgingStages]);


  const allTeamsSortedByScore = useMemo(() => {
    return [...teamRankings].sort((a, b) => b.total_score - a.total_score);
  }, [teamRankings]);


  const calculateRank = (team: TeamWithScores) => {
    return allTeamsSortedByScore.findIndex(t => t.id === team.id) + 1;
  };


  const filteredRankings = useMemo(() => {

      const filtered = teamRankings.filter((team) => {
        const teamName = team.name?.toLowerCase() || '';
        const teamProblemId = team.problem_id?.toString() || '';

        const matchesSearch = teamName.includes(searchQuery.toLowerCase().trim());


        const matchesProblem = problemFilter === 'all' || teamProblemId === problemFilter;


        if (judgeFilter !== 'all' && stageFilter) {
          const hasScoreFromJudge = scores.some(s => s.team_id === team.id && s.stage_id === stageFilter && s.judge_id === judgeFilter);
          if (!hasScoreFromJudge) return false;
        }

        return matchesSearch && matchesProblem;
      });


      return filtered.sort((a, b) => {
        let valueA: string | number, valueB: string | number;
        
        switch (sortBy) {
          case 'name':
            valueA = a.name.toLowerCase();
            valueB = b.name.toLowerCase();
            break;
          case 'problem':
            const problemA = problems.find(p => p.id === a.problem_id)?.title || '';
            const problemB = problems.find(p => p.id === b.problem_id)?.title || '';
            valueA = problemA.toLowerCase();
            valueB = problemB.toLowerCase();
            break;
          case 'score':
            valueA = a.total_score;
            valueB = b.total_score;
            break;
          case 'judges':
            valueA = a.judge_count;
            valueB = b.judge_count;
            break;
          default:
            valueA = a.total_score;
            valueB = b.total_score;

            if (sortOrder === 'asc') {
              return valueB - valueA;
            } else {
              return valueA - valueB;
            }
        }

        if (sortOrder === 'asc') {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
          return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
      });
  }, [teamRankings, searchQuery, problemFilter, judgeFilter, scores, stageFilter, sortBy, sortOrder, problems]);


  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleToggleDetails = (teamId: string) => {
    setExpandedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const toggleStar = (teamId: string) => {
    setStarredTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const isStarred = (teamId: string) => starredTeamIds.has(teamId);





  if (!currentHackathonId) {
    return <NoHackathonSelected />;
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <div className="text-center p-8 w-full max-w-3xl">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-lg text-gray-700">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <div className="text-center p-8 w-full max-w-3xl">
          <p className="text-2xl font-bold text-red-600 mb-4">Error Loading Results</p>
          <p className="text-gray-700">There was a problem fetching the data. This could be due to a network error or insufficient permissions.</p>
          <p className="font-medium mt-2 text-gray-600">{error}</p>
          <Button onClick={fetchData} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white flex items-start justify-start pt-0">
      <div className="w-full px-3 py-2 max-w-none">



      {false && filteredRankings.length > 0 && (
  <Card className="mb-2 bg-white rounded-md border border-gray-100">
          <CardHeader>
            <CardTitle className="text-center">🏆 Top Performers</CardTitle>
            <CardDescription className="text-center">
              Celebrating our hackathon champions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-start gap-4 mb-4">

              {filteredRankings[1] && (
                <div className="text-center w-52">
                  <div className="bg-white rounded-md p-3 border border-gray-100 min-w-[140px] relative">
                    <div className="absolute -top-3 -left-3 bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow">
                      2
                    </div>
                    <div className="text-lg font-semibold text-gray-900 truncate mt-4">{filteredRankings[1].name}</div>
                    <div className="text-sm text-gray-500">{filteredRankings[1].track_name || '-'}</div>
                    <div className="text-lg font-bold text-indigo-600 mt-2">{filteredRankings[1].total_score.toFixed(1)}</div>
                  </div>
                </div>
              )}


              {filteredRankings[0] && (
                <div className="text-center w-60">
                  <div className="bg-white rounded-md p-4 border border-gray-100 min-w-[160px] relative transform scale-100">
                    <div className="absolute -top-4 -left-4 bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm shadow">
                      1
                    </div>
                    <div className="text-xl font-semibold text-gray-900 truncate mt-4">{filteredRankings[0].name}</div>
                    <div className="text-sm text-gray-500">{filteredRankings[0].track_name || '-'}</div>
                    <div className="text-2xl font-bold text-indigo-600 mt-2">{filteredRankings[0].total_score.toFixed(1)}</div>
                  </div>
                </div>
              )}


              {filteredRankings[2] && (
                <div className="text-center w-52">
                  <div className="bg-white rounded-md p-3 border border-gray-100 min-w-[140px] relative">
                    <div className="absolute -top-3 -left-3 bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow">
                      3
                    </div>
                    <div className="text-lg font-semibold text-gray-900 truncate mt-4">{filteredRankings[2].name}</div>
                    <div className="text-sm text-gray-500">{filteredRankings[2].track_name || '-'}</div>
                    <div className="text-lg font-bold text-indigo-600 mt-2">{filteredRankings[2].total_score.toFixed(1)}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

  <Card className="bg-white rounded-md border border-gray-100 w-full">
        <CardHeader>
          <CardTitle>Leaderboards</CardTitle>
          <CardDescription>
            View team rankings and detailed judging breakdowns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="flex gap-2 items-center">
              <Filter className="h-4 w-4 text-gray-400" />
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="w-[180px] text-sm rounded border px-2 py-1">
                {judgingStages.map(stage => (
                  <option key={stage.stage_id} value={stage.stage_id}>{stage.stage_name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2 items-center">
              <select value={judgeFilter} onChange={(e) => setJudgeFilter(e.target.value)} className="w-[200px] text-sm rounded border px-2 py-1">
                <option value="all">All Judges</option>
                {sortedJudges.map((j) => (
                  <option key={j.judge_id} value={j.judge_id}>{j.judge_name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 items-center">
              <select value={problemFilter} onChange={(e) => setProblemFilter(e.target.value)} className="w-[180px] text-sm rounded border px-2 py-1">
                <option value="all">All Problems</option>
                {sortedProblems.map((problem) => (
                  <option key={problem.id} value={problem.id}>{problem.title}</option>
                ))}
              </select>
            </div>

          </div>
          
          

          <div className="overflow-x-auto px-0">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">
                    {enableSorting ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('rank')}
                        className="h-auto p-0 font-semibold hover:bg-transparent flex items-center gap-1"
                      >
                        Rank
                        {sortBy === 'rank' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <div className="font-semibold">Rank</div>
                    )}
                  </TableHead>
                  <TableHead className="whitespace-normal">
                    {enableSorting ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent flex items-center gap-1"
                      >
                        Team Name
                        {sortBy === 'name' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <div className="font-semibold">Team Name</div>
                    )}
                  </TableHead>
                  <TableHead className="whitespace-normal">
                    {enableSorting ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('problem')}
                        className="h-auto p-0 font-semibold hover:bg-transparent flex items-center gap-1"
                      >
                        Problem Statement
                        {sortBy === 'problem' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <div className="font-semibold">Problem Statement</div>
                    )}
                  </TableHead>
                  <TableHead className="text-right">
                    {enableSorting ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('score')}
                        className="h-auto p-0 font-semibold hover:bg-transparent flex items-center gap-1 justify-end"
                      >
                        Total Score
                        {sortBy === 'score' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <div className="font-semibold text-right">Total Score</div>
                    )}
                  </TableHead>
                  <TableHead className="text-right">
                    {enableSorting ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('judges')}
                        className="h-auto p-0 font-semibold hover:bg-transparent flex items-center gap-1 justify-end"
                      >
                        Judges
                        {sortBy === 'judges' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <div className="font-semibold text-right">Judges</div>
                    )}
                  </TableHead>
                  <TableHead className="w-[120px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {filteredRankings.map((team: TeamWithScores) => {
                  const problemStatement = problems.find(
                    (p) => p.id === team.problem_id
                  );
                  const problemTitle = problemStatement ? problemStatement.title : '-';
                  const isExpanded = expandedTeamIds.has(team.id);
                  
                  return (
                    <React.Fragment key={team.id}>
                      <TableRow className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {showStar && (
                              <button
                                onClick={() => toggleStar(team.id)}
                                aria-pressed={isStarred(team.id)}
                                title={isStarred(team.id) ? 'Unstar team' : 'Star team'}
                                className={`inline-flex items-center justify-center w-7 h-7 rounded focus:outline-none transition-colors ${isStarred(team.id) ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}
                              >

                                <span className="text-lg leading-none">{isStarred(team.id) ? '★' : '☆'}</span>
                              </button>
                            )}
                            <span>{calculateRank(team)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[240px] break-words whitespace-normal">{team.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[320px] break-words whitespace-normal">{problemTitle}</div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {team.total_score.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{team.judge_count}</span>
                              {typeof team.judge_gap_alert !== 'undefined' && (
                                <span
                                  title={team.judge_gap ? `Judge gap: ${team.judge_gap.toFixed(1)}` : 'No gap data'}
                                  className={`inline-block w-3 h-3 rounded-full ${team.judge_gap_alert ? 'bg-red-600' : 'bg-green-500'}`}
                                />
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleDetails(team.id)}
                            >
                              {isExpanded ? 'Hide Details' : 'View Details'}
                            </Button>

                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-gray-50 dark:bg-gray-800">
                          <TableCell colSpan={6}>
                            <div className="p-4 rounded-md border border-gray-200 dark:border-gray-700">
                              <h4 className="text-md font-semibold mb-2">Detailed Scores</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p><span className="font-medium">Average Novelty:</span> {team.avg_innovation.toFixed(1)}</p>
                                  <p><span className="font-medium">Average Impact:</span> {team.avg_impact.toFixed(1)}</p>
                                </div>
                                <div className="space-y-1">
                                  <p><span className="font-medium">Average Implementation:</span> {team.avg_technical_complexity.toFixed(1)}</p>
                                  {team.avg_presentation > 0 && (
                                    <p><span className="font-medium">Average Presentation:</span> {team.avg_presentation.toFixed(1)}</p>
                                  )}
                                </div>
                              </div>
                              <div className="mt-4">
                                {team.judge_gap_alert && (
                                  <div className="mb-3 inline-flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-600" />
                                    <span className="text-sm font-medium text-red-600">Judge gap alert — difference {team.judge_gap?.toFixed(1)} pts between judges</span>
                                  </div>
                                )}
                              </div>


                              <div className="mt-4">
                                <h5 className="text-sm font-semibold mb-2">Per-judge scores & feedback</h5>
                                <div className="space-y-4">
                                  {scores
                                    .filter(s => s.team_id === team.id && s.stage_id === stageFilter)
                                    .map((s, idx) => (
                                      <div key={idx} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                                        <div className="flex justify-between items-start mb-3">
                                          <h6 className="font-medium text-sm">{s.judge_name || judgeMap[s.judge_id] || s.judge_id}</h6>
                                          {s.last_updated && (
                                            <span className="text-xs text-gray-500">
                                              {new Date(s.last_updated).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZone: 'Asia/Kuala_Lumpur'
                                              })} GMT+8
                                            </span>
                                          )}
                                        </div>
                                        

                                        {(() => {
                                          const hasPresentation = team.avg_presentation > 0;
                                          const gridColsClass = hasPresentation ? 'md:grid-cols-5' : 'md:grid-cols-4';
                                          const judgeTotal = (s.innovation || 0) + (s.technical_complexity || 0) + (s.impact || 0) + (s.presentation || 0);
                                          return (
                                            <div className={`grid grid-cols-2 ${gridColsClass} gap-3 mb-3`}>
                                              <div className="text-center">
                                                <div className="text-lg font-bold text-indigo-600">{s.innovation}</div>
                                                <div className="text-xs text-gray-500">Novelty</div>
                                              </div>
                                              <div className="text-center">
                                                <div className="text-lg font-bold text-indigo-600">{s.impact}</div>
                                                <div className="text-xs text-gray-500">Impact</div>
                                              </div>
                                              <div className="text-center">
                                                <div className="text-lg font-bold text-indigo-600">{s.technical_complexity}</div>
                                                <div className="text-xs text-gray-500">Implementation</div>
                                              </div>
                                              {hasPresentation && (
                                                <div className="text-center">
                                                  <div className="text-lg font-bold text-indigo-600">{s.presentation}</div>
                                                  <div className="text-xs text-gray-500">Presentation</div>
                                                </div>
                                              )}

                                              <div className="text-center">
                                                <div className="text-lg font-bold text-gray-800">{judgeTotal.toFixed(1)}</div>
                                                <div className="text-xs text-gray-500">Total</div>
                                              </div>
                                            </div>
                                          );
                                        })()}


                                        <div className="space-y-2">
                                          <div>
                                            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Feedback:</span>
                                            <p className="text-sm text-gray-700 mt-1 break-words whitespace-pre-wrap">
                                              {s.feedback && s.feedback.trim() ? s.feedback : "-"}
                                            </p>
                                          </div>
                                          <div>
                                            <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Strengths:</span>
                                            <p className="text-sm text-gray-700 mt-1 break-words whitespace-pre-wrap">
                                              {s.strength && s.strength.trim() ? s.strength : "-"}
                                            </p>
                                          </div>
                                          <div>
                                            <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Areas for Improvement:</span>
                                            <p className="text-sm text-gray-700 mt-1 break-words whitespace-pre-wrap">
                                              {s.improvement && s.improvement.trim() ? s.improvement : "-"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}

                {filteredRankings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No results match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default ResultsPage;