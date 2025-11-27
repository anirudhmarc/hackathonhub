import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useHackathon } from '@/contexts/HackathonContext';
import { useAuth } from '@/contexts/AuthContext';
import { ScoringCard } from '@/components/ScoringCard';
import { LoadingTeamsList } from '@/components/TeamCardSkeleton';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, X, Clock, AlertCircle, CheckCircle, LockIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { isReadOnlyMode, isReadOnlyForStage } from '@/utils/readOnlyMode';
import { getScoringTimeStatus, getTimeUntilStatusChange, type ScoringTimeStatus } from '@/utils/scoringDateTimeControl';

const TeamsPage = () => {
  const { state, hasJudgeEvaluatedTeam, dispatch, refreshProblemStatements, refreshData } = useHackathon();
  const { user } = useAuth();
  const { toast } = useToast();
  const { assignedTeams: teams, problemStatements, selectedJudge, isLoading, judgingStages, currentStage } = state;

  const readOnlyMode = isReadOnlyForStage(currentStage?.stage_name ?? null);
  
  
  const hasAssignedTeams = useMemo(() => {
    if (!teams || !currentStage || !selectedJudge) return false;
    
    if (currentStage.stage_id === 'stage_2') {
      const finalistTeams = teams.filter(team => team.is_finalist === true);
      return finalistTeams.length > 0;
    }
    return teams.length > 0;
  }, [teams, currentStage, selectedJudge]);

  const shouldDisableScoreFetching = useMemo(() => {
    return !hasAssignedTeams || readOnlyMode;
  }, [hasAssignedTeams, readOnlyMode]);
  
  
  const [scoringTimeStatus, setScoringTimeStatus] = useState<ScoringTimeStatus>(getScoringTimeStatus());
  
  
  const sortedProblemStatements = useMemo(() => {
    if (!problemStatements) return [];
    return [...problemStatements].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [problemStatements]);
  
  const [selectedTrack, setSelectedTrack] = useState<string>('all-tracks');
  const [selectedProblem, setSelectedProblem] = useState<string>('all-problems');
  const [submissionFilter, setSubmissionFilter] = useState<string>('submitted');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [teamsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const MAX_RETRY_ATTEMPTS = 3;
  const RETRY_DELAY = 2000;

  const effectiveAutoRefreshEnabled = autoRefreshEnabled && !shouldDisableScoreFetching;
  
    
  useEffect(() => {
    const updateScoringStatus = () => {
      setScoringTimeStatus(getScoringTimeStatus());
    };
    
    updateScoringStatus();
    const interval = setInterval(updateScoringStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTrack, selectedProblem, submissionFilter]);

  const optimizedSearch = useMemo(() => {
    if (!debouncedSearchQuery || debouncedSearchQuery.trim() === '') return null;
    return debouncedSearchQuery.toLowerCase().trim().split(/\s+/);
  }, [debouncedSearchQuery]);
  
  
  const detectDataLoadingFailure = useCallback(() => {
    if (!isLoading && (!teams || teams.length === 0 || !currentStage)) {
      return true;
    }
    return false;
  }, [teams, currentStage, isLoading]);

  const handleAutoRefresh = useCallback(async () => {
    if (shouldDisableScoreFetching) {
      return;
    }

    if (!effectiveAutoRefreshEnabled || retryCount >= MAX_RETRY_ATTEMPTS) {
      return;
    }

    setIsRefreshing(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await refreshData();
      
      
      setRetryCount(0);
      setLastError(null);
      
      toast({
        title: "Auto-refresh successful",
        description: `Data refreshed automatically (attempt ${retryCount + 1})`,
      });
    } catch (error) {
      setLastError(error as Error);
      
      if (retryCount + 1 >= MAX_RETRY_ATTEMPTS) {
        toast({
          title: "Auto-refresh failed",
          description: `Failed to refresh data after ${MAX_RETRY_ATTEMPTS} attempts. Please refresh manually.`,
          variant: "destructive",
        });
        setAutoRefreshEnabled(false);
      } else {
        toast({
          title: "Retrying data refresh",
          description: `Attempt ${retryCount + 1} of ${MAX_RETRY_ATTEMPTS}...`,
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [effectiveAutoRefreshEnabled, retryCount, refreshData, toast, MAX_RETRY_ATTEMPTS, shouldDisableScoreFetching]);

  useEffect(() => {
    if (detectDataLoadingFailure() && effectiveAutoRefreshEnabled && !isRefreshing && hasAssignedTeams) {
      const timer = setTimeout(() => {
        handleAutoRefresh();
      }, RETRY_DELAY);

      return () => clearTimeout(timer);
    }
  }, [detectDataLoadingFailure, effectiveAutoRefreshEnabled, isRefreshing, handleAutoRefresh, RETRY_DELAY, hasAssignedTeams]);

  const resetAutoRefresh = useCallback(() => {
    setRetryCount(0);
    setLastError(null);
    setAutoRefreshEnabled(true);
  }, []);
  
  useEffect(() => {
    if (judgingStages.length > 0 && !currentStage) {
      const preliminaryStage = judgingStages.find(stage => stage.stage_name === 'Preliminary Round');
      if (preliminaryStage) {
        dispatch({ type: 'SET_CURRENT_STAGE', payload: preliminaryStage });
      } else {
        dispatch({ type: 'SET_CURRENT_STAGE', payload: judgingStages[0] });
      }
    }
  }, [judgingStages, currentStage, dispatch]);

  const handleStageChange = useCallback((stageId: string) => {
    const stage = judgingStages.find(s => s.stage_id === stageId);
    if (stage) {
      dispatch({ type: 'SET_CURRENT_STAGE', payload: stage });
    }
  }, [judgingStages, dispatch]);

  const filteredTeams = useMemo(() => {
    try {
      if (!teams) return [];
      
      return teams.filter(team => {
        try {
          const teamNumber = team.id?.split('-').pop();
          const isFinalist = team.is_finalist === true;

          if (currentStage?.stage_name === 'Final Round' && !isFinalist) {
              return false;
          }
          
          
          if (selectedTrack !== 'all-tracks' && team.track?.toLowerCase() !== selectedTrack) {
            return false;
          }
          
          
          if (selectedProblem !== 'all-problems' && team.problem_id !== selectedProblem) {
            return false;
          }
          
          
          if (submissionFilter !== 'all') {
            const hasSubmission = team.submission_video_url && team.submission_video_url.trim() !== '';
            if (submissionFilter === 'submitted' && !hasSubmission) {
              return false;
            }
            if (submissionFilter === 'not-submitted' && hasSubmission) {
              return false;
            }
          }
          
          
          if (optimizedSearch && optimizedSearch.length > 0) {
            const teamName = (team.name || '').toLowerCase();
            const teamNumberStr = teamNumber?.toString() || '';
            const memberNames = team.members ? 
              team.members.map(member => (member.name || '').toLowerCase()).join(' ') : '';
            
            const searchableText = `${teamName} ${teamNumberStr} ${memberNames}`;
            
            
            const matches = optimizedSearch.every(term => searchableText.includes(term));
            if (!matches) return false;
          }
          
          return true;
        } catch (error) {
          
          if (import.meta.env.DEV) {
            
          }
          return true;
        }
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        
      }
  return teams || [];
    }
  }, [teams, selectedTrack, selectedProblem, submissionFilter, optimizedSearch, currentStage]);
  
  
  const sortedTeams = useMemo(() => {
    try {
      const sorted = [...filteredTeams].sort((a, b) => {
        try {
          const numA = parseInt(a.id?.split('-').pop() || '0');
          const numB = parseInt(b.id?.split('-').pop() || '0');
          return numA - numB;
        } catch (error) {
          
          return (a.id || '').localeCompare(b.id || '');
        }
      });
      return sorted;
    } catch (error) {
      if (import.meta.env.DEV) {
        
      }
  return filteredTeams;
    }
  }, [filteredTeams]);

  
  const paginatedTeams = useMemo(() => {
    try {
      const totalTeams = sortedTeams.length;
      if (totalTeams === 0) return [];
      
      const startIndex = Math.max(0, (currentPage - 1) * teamsPerPage);
      const endIndex = Math.min(totalTeams, startIndex + teamsPerPage);
      
      return sortedTeams.slice(startIndex, endIndex);
    } catch (error) {
      if (import.meta.env.DEV) {
        
      }
  return sortedTeams.slice(0, teamsPerPage);
    }
  }, [sortedTeams, currentPage, teamsPerPage]);

  
  const totalPages = Math.max(1, Math.ceil(sortedTeams.length / teamsPerPage));
  const startTeam = sortedTeams.length > 0 ? (currentPage - 1) * teamsPerPage + 1 : 0;
  const endTeam = Math.min(currentPage * teamsPerPage, sortedTeams.length);

  
  const handleClearFilters = useCallback(() => {
    setSelectedTrack('all-tracks');
    setSelectedProblem('all-problems');
  setSubmissionFilter('all');
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setCurrentPage(1);
  }, []);

  
  const handleRefreshTeams = useCallback(async () => {
    
    if (shouldDisableScoreFetching) {
      setIsRefreshing(true);
      try {
  await refreshData();
        const reason = !hasAssignedTeams 
          ? "No assigned teams - viewing data only" 
          : "View-only mode";
        toast({
          title: "Data Refreshed",
          description: `Team, judge, and problem statement data has been updated (${reason}).`,
        });
      } catch (error) {
        toast({
          title: "Refresh Failed", 
          description: "Failed to refresh data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsRefreshing(false);
      }
      return;
    }

  if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    
    resetAutoRefresh();
    
    try {
  await refreshData();
      
      toast({
        title: "Data Refreshed",
        description: "Teams and scoring data have been updated.",
      });
    } catch (error) {
      
      toast({
        title: "Refresh Failed", 
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, isRefreshing, toast, resetAutoRefresh, shouldDisableScoreFetching, hasAssignedTeams]);

  
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setCurrentPage(1);
  }, []);

  
  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const handlePageSelect = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  if (isLoading || !currentStage) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 transition-all hover:shadow-lg border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Input placeholder="Search teams..." disabled className="w-full" />
            </div>
            
            <div className="flex gap-4 items-center">
              <Select disabled>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Tracks" />
                </SelectTrigger>
              </Select>
              
              <Select disabled>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
              </Select>
              
              <div className="flex items-center gap-2">
                <Select disabled>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="All Problem" />
                  </SelectTrigger>
                </Select>
                
                <Button variant="outline" size="sm" disabled className="px-3 h-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                    <path d="M3 21v-5h5"/>
                  </svg>
                </Button>
              </div>
              
              <Button variant="outline" disabled>
                Clear Filters
              </Button>
            </div>
          </div>
          
          
          <LoadingTeamsList count={teamsPerPage} />
        </div>
      </div>
    );
  }

  
  if (!isLoading && currentStage && !selectedJudge && user) {
    return (
      <div className="w-full">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/>
                <circle cx="12" cy="17" r="1"/>
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Loading issue...</h3>
            
            <div className="flex justify-center">
              <Button 
                onClick={() => window.location.reload()}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }  return (
    <div className="w-full animate-fade-in">
      

      <div className="bg-white rounded-lg shadow-md p-6 mb-6 transition-all hover:shadow-lg border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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
                onClick={handleClearSearch}
                className="absolute right-3 top-3"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          
          <div className="flex items-center">
            <Select value={submissionFilter} onValueChange={(value) => setSubmissionFilter(value)}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent className='bg-white z-50'>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="submitted">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    With Submission
                  </div>
                </SelectItem>
                <SelectItem value="not-submitted">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    No Submission
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          
          <div className="flex gap-4 items-center">
            <Select value={selectedTrack} onValueChange={(value) => setSelectedTrack(value)}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="All Tracks" />
              </SelectTrigger>
              <SelectContent className='bg-white z-50'>
                <SelectItem value="all-tracks">All Tracks</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          
          <div className="flex items-center gap-2">
            <Select value={selectedProblem} onValueChange={(value) => setSelectedProblem(value)}>
              <SelectTrigger className="w-[220px] h-10">
                <SelectValue placeholder="All Problem" />
              </SelectTrigger>
              <SelectContent className='bg-white z-50'>
                <SelectItem value="all-problems">All Problem</SelectItem>
                {sortedProblemStatements.map((problem) => (
                  <SelectItem key={problem.id} value={problem.id}>
                    {problem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshTeams}
            disabled={isRefreshing}
            className="px-3 h-10"
            title={
              !hasAssignedTeams
                ? "Refresh viewing data: teams, judges, problem statements (no assigned teams)"
                : readOnlyMode
                ? "Refresh viewing data: teams, judges, problem statements (view-only mode)"
                : isRefreshing 
                ? "Refreshing data..." 
                : effectiveAutoRefreshEnabled && retryCount > 0
                  ? `Auto-refresh enabled (${retryCount}/${MAX_RETRY_ATTEMPTS} attempts)`
                  : "Manually refresh teams and scoring data"
            }
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={isRefreshing ? "animate-spin" : ""}
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
          </Button>
          
          <Button variant="outline" onClick={handleClearFilters}>
            Clear Filters
          </Button>

        </div>
        
        {sortedTeams.length > 0 ? (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-3">
              <div className="flex items-center gap-2">
                <span>
                  Showing {startTeam}-{endTeam} of {sortedTeams.length} teams
                  {debouncedSearchQuery && ` (filtered)`}
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
                    onClick={handlePreviousPage}
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
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
            
            
            <div className="flex flex-col gap-4">
              {paginatedTeams.map((team) => {
                return (
                  <ScoringCard
                    key={team.id}
                    team={team}
                    problemStatement={team.problem_statement || 'Unknown Problem'}
                    problemId={team.problem_id || null}
                    track={team.track as 'student' | 'corporate' || 'unknown'}
                    hasBeenEvaluated={!!(selectedJudge && currentStage && hasJudgeEvaluatedTeam(selectedJudge.id, team.id, currentStage.stage_id))}
                  />
                );
              })}
            </div>

            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
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
                        onClick={() => handlePageSelect(pageNum)}
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
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : !hasAssignedTeams ? (
          <div className="text-center py-12 border rounded-lg bg-blue-50 border-blue-200">
            <div className="flex justify-center mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                className="text-blue-500"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="m22 2-5 5"/>
                <path d="m17 2 5 5"/>
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2 text-blue-800">No Teams Assigned</h3>
            <p className="text-blue-600 mb-4">
              {currentStage?.stage_name === 'Final Round' 
                ? 'You are not assigned to judge any finalist teams in this round.'
                : 'You are not assigned to judge any teams in this stage.'}
            </p>
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <h3 className="text-xl font-medium mb-2">No teams found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or search query
            </p>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(TeamsPage);