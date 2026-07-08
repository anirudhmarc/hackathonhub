import { useState, useMemo, useEffect } from 'react';
import { useHackathon } from '@/contexts/HackathonContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, X, LayoutGrid, Table as TableIcon, RefreshCw } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResultsCard } from '@/components/ResultsCard';
import { TeamRanking } from '@/services/api';
import { Spinner } from '@/components/ui/spinner';

const ResultsPage = () => {
  const { state, dispatch, refreshData } = useHackathon();
  const { allTeams, problemStatements, scores, isLoading, judgingStages, currentStage } = state;

  const sortedProblemStatements = useMemo(() => {
    if (!problemStatements) return [];
    return [...problemStatements].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [problemStatements]);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [problemFilter, setProblemFilter] = useState<string>('all');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [showFinalistsOnly, setShowFinalistsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [processingAuth] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const TEAMS_PER_PAGE = 10;

  const handleClearFilters = () => {
    setSearchQuery('');
    setProblemFilter('all');
    setTrackFilter('all');
    setCurrentPage(1);
  };

  const forceClearCacheAndRefresh = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_') || key.startsWith('cache_time_')) {
        localStorage.removeItem(key);
      }
    });
    refreshData();
  };

  useEffect(() => {
    if (judgingStages.length > 0) {
      const preliminaryStage = judgingStages.find(stage => stage.stage_name === 'Preliminary Round');
      if (preliminaryStage) {
        dispatch({ type: 'SET_CURRENT_STAGE', payload: preliminaryStage });
        setStageFilter(preliminaryStage.stage_id);
        setShowFinalistsOnly(false);
      } else {
        const defaultStage = judgingStages[0];
        dispatch({ type: 'SET_CURRENT_STAGE', payload: defaultStage });
        setStageFilter(defaultStage.stage_id);
        setShowFinalistsOnly(defaultStage.stage_name === 'Final Round');
      }
    }
  }, [judgingStages, dispatch]);

  useEffect(() => {
    if (currentStage && stageFilter !== currentStage.stage_id) {
        setStageFilter(currentStage.stage_id);
        setShowFinalistsOnly(currentStage.stage_name === 'Final Round');
    }
  }, [currentStage, stageFilter]);

  useEffect(() => {
    return;
  }, [scores, currentStage, allTeams, isLoading]);

  useEffect(() => {
    refreshData();
  }, []);

  const handleStageChange = (stageId: string) => {
    const stage = judgingStages.find(s => s.stage_id === stageId);
    if (stage) {
      setStageFilter(stage.stage_id);
      dispatch({ type: 'SET_CURRENT_STAGE', payload: stage });
      setShowFinalistsOnly(stage.stage_name === 'Final Round');
    }
  };
  
  const teamRankings = useMemo(() => {
    if (!allTeams || !scores || !stageFilter) return [];

    return allTeams
      .map((team) => {
        const teamScores = (scores || []).filter(
          (score) => score.team_id === team.id && score.stage_id === stageFilter
        );
        
        const judgeCount = teamScores.length;
        if (judgeCount === 0) {
          return {
            ...team,
            total_score: 0,
            track: team.track?.toLowerCase() || 'unknown',
            avg_innovation: 0,
            avg_technical_complexity: 0,
            avg_impact: 0,
            avg_presentation: 0,
            aws_special_award_yes: 0,
            aws_special_award_no: 0,
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

        const currentStageObj = judgingStages.find(stage => stage.stage_id === stageFilter);
        const isFinalRound = currentStageObj?.stage_name === 'Final Round';
        
        let awsSpecialAwardYes = 0;
        let awsSpecialAwardNo = 0;
        
        if (isFinalRound) {
          teamScores.forEach(score => {
            if (score.strength && score.strength.startsWith('AWS_SPECIAL_AWARD:')) {
              const awsValue = score.strength.replace('AWS_SPECIAL_AWARD:', '');
              if (awsValue === 'true') awsSpecialAwardYes++;
              else if (awsValue === 'false') awsSpecialAwardNo++;
            }
          });
        }

        return {
          ...team,
          total_score: totalScore,
          avg_innovation: avgInnovation,
          avg_technical_complexity: avgTechnicalComplexity,
          avg_impact: avgImpact,
          avg_presentation: avgPresentation,
          aws_special_award_yes: awsSpecialAwardYes,
          aws_special_award_no: awsSpecialAwardNo,
          judge_count: judgeCount,
          track: team.track?.toLowerCase() || 'unknown',
        };
      })
      .sort((a, b) => b.total_score - a.total_score);
  }, [allTeams, scores, stageFilter]);

  const filteredRankings = useMemo(() => {
    return teamRankings.filter((team) => {
      const teamName = team.name?.toLowerCase() || '';
      const teamNumber = team.team_number?.toString() || '';
      const teamProblemId = team.problem_id?.toString() || '';
      const teamTrack = team.track?.toLowerCase() || '';
      const search = (debouncedSearchQuery || '').toLowerCase();
      const matchesSearch = search === '' || teamName.includes(search) || teamNumber.includes(search);

      const matchesProblem = problemFilter === 'all' || teamProblemId === problemFilter;

      const matchesTrack =
      trackFilter === 'all' || teamTrack === trackFilter;

      const matchesFinalistStatus = !showFinalistsOnly || team.is_finalist;

      return matchesSearch && matchesProblem && matchesTrack && matchesFinalistStatus;
    });
  }, [teamRankings, debouncedSearchQuery, problemFilter, trackFilter, showFinalistsOnly]);

  const totalTeams = filteredRankings.length;
  const totalPages = Math.ceil(totalTeams / TEAMS_PER_PAGE);
  const startIndex = (currentPage - 1) * TEAMS_PER_PAGE;
  const endIndex = startIndex + TEAMS_PER_PAGE;
  const paginatedRankings = filteredRankings.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, problemFilter, trackFilter, showFinalistsOnly, stageFilter]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  if (processingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4">Processing authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading || !allTeams || !stageFilter) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 transition-all hover:shadow-lg border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input placeholder="Search teams..." disabled className="pl-10 h-10 w-full" />
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              <Select disabled>
                <SelectTrigger className="w-full sm:w-[180px] h-10">
                  <SelectValue placeholder="All Tracks" />
                </SelectTrigger>
              </Select>
              
              <Select disabled>
                <SelectTrigger className="w-full sm:w-[220px] h-10">
                  <SelectValue placeholder="All Problem" />
                </SelectTrigger>
              </Select>
              
              <Button variant="outline" size="sm" disabled className="px-3 h-10">
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" disabled className="h-10">
                Clear Filters
              </Button>
            </div>
          </div>
          
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Spinner size="lg" />
            </div>
            <h3 className="text-xl font-medium mb-2">Loading Results...</h3>
            <p className="text-muted-foreground">
              Fetching leaderboard data and team rankings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!scores || scores.length === 0) {
    return (
      <div className="w-full animate-fade-in">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 transition-all hover:shadow-lg border border-gray-100">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No Scores Available</h2>
            <p className="text-gray-500 mb-6">
              No judging scores have been submitted yet for the current stage.
            </p>
            <Button 
              onClick={forceClearCacheAndRefresh} 
              variant="outline" 
              className="flex items-center gap-2 mx-auto h-10"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 transition-all hover:shadow-lg border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 w-full"
            />
            {(searchQuery || debouncedSearchQuery) && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <Select value={problemFilter} onValueChange={setProblemFilter}>
              <SelectTrigger className="w-full sm:w-[220px] h-10">
                <SelectValue placeholder="All Problem" />
              </SelectTrigger>
              <SelectContent className='bg-white z-50'>
                <SelectItem value="all">All Problem</SelectItem>
                {sortedProblemStatements.map((problem) => (
                  <SelectItem key={problem.id} value={problem.id.toString()}>
                    {problem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>



            <Button
              variant="outline"
              size="sm"
              onClick={forceClearCacheAndRefresh}
              disabled={isLoading}
              className="px-3 h-10"
              title={isLoading ? "Refreshing data..." : "Refresh leaderboard data"}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button variant="outline" onClick={handleClearFilters} className="h-10">
              Clear Filters
            </Button>

            <div className="flex border rounded-md overflow-hidden shadow-sm h-10">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-none h-full"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-none h-full"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-3">
              <div className="flex items-center gap-2">
                <span>
                  Showing {startIndex + 1}-{Math.min(endIndex, totalTeams)} of {totalTeams} teams
                  {(searchQuery || problemFilter !== 'all' || trackFilter !== 'all') && ` (filtered)`}
                  {searchQuery !== debouncedSearchQuery && (
                    <svg className="inline ml-1 h-4 w-4 animate-spin text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  )}
                </span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Problem Statement</TableHead>
                  <TableHead className="text-right">Innovation</TableHead>
                  <TableHead className="text-right">Implementation</TableHead>
                  <TableHead className="text-right">Impact</TableHead>
                  <TableHead className="text-right">Presentation</TableHead>
                  <TableHead className="text-right">Total Score</TableHead>

                  {currentStage && currentStage.stage_name === 'Final Round' && (
                    <TableHead className="text-right">AWS Special Award</TableHead>
                  )}
                  <TableHead className="text-right">Judges</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRankings.map((team, index) => {
                  const problemStatement = problemStatements.find(
                    (p) => p.id === team.problem_id
                  );
                  const globalRank = startIndex + index + 1;

                  return (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{globalRank}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">Team {team.team_number}: {team.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {problemStatement?.name || 'No Problem Selected'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{problemStatement?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right">
                        {team.avg_innovation.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {team.avg_technical_complexity.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {team.avg_impact.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {team.avg_presentation.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {team.total_score.toFixed(1)}
                      </TableCell>

                      {currentStage && currentStage.stage_name === 'Final Round' && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-purple-600">{team.aws_special_award_yes}⭐</span>
                            <span className="mx-1">/</span>
                            <span className="text-gray-600">{team.aws_special_award_no}⚪</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {team.judge_count}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {paginatedRankings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={currentStage && currentStage.stage_name === 'Final Round' ? 12 : 11} className="text-center py-8 text-gray-500">
                      {totalTeams === 0 
                        ? "No results match your filters. Try adjusting your search criteria."
                        : "No teams on this page."
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-3">
              <div className="flex items-center gap-2">
                <span>
                  Showing {startIndex + 1}-{Math.min(endIndex, totalTeams)} of {totalTeams} teams
                  {(searchQuery || problemFilter !== 'all' || trackFilter !== 'all') && ` (filtered)`}
                  {searchQuery !== debouncedSearchQuery && (
                    <svg className="inline ml-1 h-4 w-4 animate-spin text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  )}
                </span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
            
            
            <div className="flex flex-col gap-4">
              {paginatedRankings.map((team, index) => {
                const globalRank = startIndex + index + 1;
                return (
                  <ResultsCard key={team.id} team={team} rank={globalRank} stageId={stageFilter} />
                );
              })}
            </div>

            {paginatedRankings.length === 0 && (
              <div className="text-center py-12 border rounded-lg bg-muted/20">
                <h3 className="text-xl font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  {totalTeams === 0 
                    ? "No results match your filters. Try adjusting your search criteria."
                    : "No teams on this page."
                  }
                </p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}

            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;