import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentHackathon } from '../contexts/CurrentHackathonContext';
import {
  ProblemStatement,
  Team,
  Judge,
  Score,
  JudgingStage,
  useTeams,
  useProblemStatements,
  useJudges,
  useScores,
  useJudgingStages,
  getCurrentHackathonId
} from '../services/api';
import { timestampService } from '../services/timestampService';
import { isReadOnlyMode, isReadOnlyForStage } from '../utils/readOnlyMode';

interface HackathonState {
  allTeams: Team[];
  assignedTeams: Team[];
  problemStatements: ProblemStatement[];
  judges: Judge[];
  scores: Score[];
  judgingStages: JudgingStage[];
  currentStage: JudgingStage | null;
  selectedJudge: Judge | null;
  isLoading: boolean;
  error: string | null;
}

type HackathonAction =
  | { type: 'SET_ALL_TEAMS'; payload: Team[] }
  | { type: 'SET_ASSIGNED_TEAMS'; payload: Team[] }
  | { type: 'SET_PROBLEM_STATEMENTS'; payload: ProblemStatement[] }
  | { type: 'SET_JUDGES'; payload: Judge[] }
  | { type: 'SET_SCORES'; payload: Score[] }
  | { type: 'SET_JUDGING_STAGES'; payload: JudgingStage[] }
  | { type: 'SET_CURRENT_STAGE'; payload: JudgingStage }
  | { type: 'SELECT_JUDGE'; payload: Judge | null }
  | {
      type: 'ADD_SCORE';
      payload: {
        id: string;
        team_id: string;
        judge_id: string;
        innovation: number;
        technical_complexity: number;
        impact: number;
        presentation: number;
        feedback: string;
        strength: string;
        improvement: string;
        timestamp: string;
        stage_id: string;
      };
    }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: HackathonState = {
  allTeams: [],
  assignedTeams: [],
  problemStatements: [],
  judges: [],
  scores: [],
  judgingStages: [],
  currentStage: null,
  selectedJudge: null,
  isLoading: true,
  error: null,
};

const HackathonContext = createContext<{
  state: HackathonState;
  dispatch: React.Dispatch<HackathonAction>;
  hasJudgeEvaluatedTeam: (judgeId: string, teamId: string, stageId: string) => boolean;
  getTeamScore: (teamId: string, stageId: string) => number;
  refreshData: () => void;
  refreshProblemStatements: () => void;
  calculateAverageScores: (teamId: string, stageId: string) => {
    innovation: number;
    technicalComplexity: number;
    impact: number;
    presentation: number;
    total: number;
  };
  getTeamScores: (teamId: string, stageId: string) => Array<{
    judgeId: string;
    judgeName: string;
    innovation: number;
    technicalComplexity: number;
    impact: number;
    presentation: number;
    feedback?: string;
    strength?: string;
    improvement?: string;
    total: number;
  }>;
  getJudgeScoreForTeam: (judgeId: string, teamId: string, stageId: string) => Score | undefined;
  shouldLockLeaderboard: boolean;
}>({
  state: initialState,
  dispatch: () => null,
  hasJudgeEvaluatedTeam: () => false,
  getTeamScore: () => 0,
  refreshData: () => {},
  refreshProblemStatements: () => {},
  calculateAverageScores: () => ({ innovation: 0, technicalComplexity: 0, impact: 0, presentation: 0, total: 0 }),
  getTeamScores: () => [],
  getJudgeScoreForTeam: () => undefined,
  shouldLockLeaderboard: false,
});

const hackathonReducer = (state: HackathonState, action: HackathonAction): HackathonState => {
  switch (action.type) {
    case 'SET_ALL_TEAMS':
      return { ...state, allTeams: action.payload };
    case 'SET_ASSIGNED_TEAMS':
      return { ...state, assignedTeams: action.payload };
    case 'SET_PROBLEM_STATEMENTS':
      return { ...state, problemStatements: action.payload };
    case 'SET_JUDGES':
      return { ...state, judges: action.payload };
    case 'SET_SCORES':
      return { ...state, scores: action.payload };
    case 'SET_JUDGING_STAGES':
      return { ...state, judgingStages: action.payload };
    case 'SET_CURRENT_STAGE':
      return { ...state, currentStage: action.payload };
    case 'SELECT_JUDGE':
      return { ...state, selectedJudge: action.payload };
    case 'ADD_SCORE':
      return {
        ...state,
        scores: [...state.scores.filter(s =>
          !(s.team_id === action.payload.team_id && s.judge_id === action.payload.judge_id && s.stage_id === action.payload.stage_id)
        ), action.payload]
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const HackathonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(hackathonReducer, initialState);
  const { isAuthenticated, user } = useAuth();
  const { currentHackathonId } = useCurrentHackathon();

  const readOnlyMode = isReadOnlyForStage(state.currentStage?.stage_name ?? null);

  const judgeHasFinalistTeams = React.useMemo(() => {
    if (!state.selectedJudge || !state.assignedTeams || !state.currentStage) return true;
    
    if (state.currentStage.stage_id === 'stage_2') {
      const finalistTeams = state.assignedTeams.filter(team => team.is_finalist === true);
      return finalistTeams.length > 0;
    }
    
    return true;
  }, [state.selectedJudge, state.assignedTeams, state.currentStage]);

  const shouldLockLeaderboard = React.useMemo(() => {
    return false;
  }, []);

  useEffect(() => {
    timestampService.loadTimestampData();
  }, []);

  const shouldMakeViewingApiCalls = isAuthenticated && !!currentHackathonId;
  const shouldMakeScoresApiCalls = isAuthenticated && !!currentHackathonId && !!state.currentStage?.stage_id;

  // When the selected hackathon changes, clear the selected judge and scores so
  // we don't carry over data from the previous tenant while the new one loads.
  // Stage state is preserved (stage ids are shared across hackathons) so the
  // stage-selection logic keeps working; the namespaced query keys refetch the
  // new hackathon's teams/judges/scores automatically.
  useEffect(() => {
    dispatch({ type: 'SELECT_JUDGE', payload: null });
    dispatch({ type: 'SET_SCORES', payload: [] });
    dispatch({ type: 'SET_ALL_TEAMS', payload: [] });
    dispatch({ type: 'SET_ASSIGNED_TEAMS', payload: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHackathonId]);

  const allTeamsApi = useTeams(null, null, shouldMakeViewingApiCalls, { noCache: true });
  const assignedTeamsApi = useTeams(state.selectedJudge?.id || null, state.currentStage?.stage_id || null, shouldMakeViewingApiCalls, { noCache: true });
  const problemStatementsApi = useProblemStatements(shouldMakeViewingApiCalls);
  const judgesApi = useJudges(shouldMakeViewingApiCalls, { noCache: true });
  const scoresApi = useScores(state.currentStage?.stage_id || null, shouldMakeScoresApiCalls);
  const judgingStagesApi = useJudgingStages(shouldMakeViewingApiCalls);

  const hasJudgeEvaluatedTeam = useCallback((judgeId: string, teamId: string, stageId: string): boolean => {
    return state.scores.some(score => score.judge_id === judgeId && score.team_id === teamId && score.stage_id === stageId);
  }, [state.scores]);
  
  const getTeamScore = useCallback((teamId: string, stageId: string): number => {
    const teamScores = state.scores.filter(score => score.team_id === teamId && score.stage_id === stageId);
    if (teamScores.length === 0) return 0;
    
    const totalScore = teamScores.reduce((sum, score) => {
      return sum + score.innovation + score.technical_complexity + score.impact + score.presentation;
    }, 0);
    
    return totalScore / teamScores.length;
  }, [state.scores]);

  const calculateAverageScores = useCallback((teamId: string, stageId: string) => {
    const teamScores = state.scores.filter(score => score.team_id === teamId && score.stage_id === stageId);
    
    if (teamScores.length === 0) {
      return {
        innovation: 0,
        technicalComplexity: 0,
        impact: 0,
        presentation: 0,
        total: 0
      };
    }
    
    const innovation = teamScores.reduce((sum, score) => sum + score.innovation, 0) / teamScores.length;
    const technicalComplexity = teamScores.reduce((sum, score) => sum + score.technical_complexity, 0) / teamScores.length;
    const impact = teamScores.reduce((sum, score) => sum + score.impact, 0) / teamScores.length;
    const presentation = teamScores.reduce((sum, score) => sum + score.presentation, 0) / teamScores.length;
    
    return {
      innovation,
      technicalComplexity,
      impact,
      presentation,
      total: innovation + technicalComplexity + impact + presentation
    };
  }, [state.scores]);
  
  const getJudgeScoreForTeam = useCallback((judgeId: string, teamId: string, stageId: string): Score | undefined => {
    return state.scores.find(score => score.judge_id === judgeId && score.team_id === teamId && score.stage_id === stageId);
  }, [state.scores]);
  
  const getTeamScores = useCallback((teamId: string, stageId: string) => {
    const teamScores = state.scores.filter(score => score.team_id === teamId && score.stage_id === stageId);
    
    return teamScores.map(score => {
      const judge = state.judges.find(j => j.id === score.judge_id);
      
      return {
        judgeId: score.judge_id,
        judgeName: judge?.name || 'Unknown Judge',
        innovation: score.innovation,
        technicalComplexity: score.technical_complexity,
        impact: score.impact,
        presentation: score.presentation,
        feedback: score.feedback,
        strength: score.strength,
        improvement: score.improvement,
        total: score.innovation + score.technical_complexity + score.impact + score.presentation
      };
    });
  }, [state.scores, state.judges]);

  const refreshData = useCallback(() => {
    allTeamsApi.refetch();
    judgesApi.refetch();
    problemStatementsApi.refetch();
    judgingStagesApi.refetch();
    
    if (!shouldLockLeaderboard) {
      if (state.currentStage) {
        const hid = getCurrentHackathonId() ?? 'none';
        localStorage.removeItem(`cache_${hid}:scores-${state.currentStage.stage_id}`);
        localStorage.removeItem(`cache_time_${hid}:scores-${state.currentStage.stage_id}`);
      }
      scoresApi.refetch();
    }
  }, [scoresApi, allTeamsApi, judgesApi, problemStatementsApi, judgingStagesApi, state.currentStage, shouldLockLeaderboard]);

  const refreshProblemStatements = useCallback(() => {
    if (readOnlyMode) {
      return;
    }
    
    const lastRefreshKey = 'problemStatements_lastRefresh';
    const lastRefresh = localStorage.getItem(lastRefreshKey);
    const now = Date.now();
    
    if (lastRefresh && (now - parseInt(lastRefresh)) < 5000) {
      return;
    }
    
    localStorage.setItem(lastRefreshKey, now.toString());
    const hid = getCurrentHackathonId() ?? 'none';
    localStorage.removeItem(`cache_${hid}:problemStatements`);
    localStorage.removeItem(`cache_time_${hid}:problemStatements`);
    problemStatementsApi.refetch();
  }, [problemStatementsApi, readOnlyMode]);
  
  useEffect(() => {
    const isAnyLoading = allTeamsApi.isLoading || assignedTeamsApi.isLoading || problemStatementsApi.isLoading || judgesApi.isLoading || scoresApi.isLoading || judgingStagesApi.isLoading;
    
    dispatch({ type: 'SET_LOADING', payload: isAnyLoading });
    
    if (allTeamsApi.data) {
        const processedTeams = allTeamsApi.data.map(team => ({
            ...team,
            track: team.track?.toLowerCase().replace(' track', '').trim() || 'unknown'
        }));
        
        const teamsWithTimestamps = timestampService.mergeWithTeamData(processedTeams);
        dispatch({ type: 'SET_ALL_TEAMS', payload: teamsWithTimestamps });
    }
    if (assignedTeamsApi.data !== undefined) {
        const processedAssignedTeams = (assignedTeamsApi.data || []).map(team => ({
            ...team,
            track: team.track?.toLowerCase().replace(' track', '').trim() || 'unknown'
        }));
        
        const assignedTeamsWithTimestamps = timestampService.mergeWithTeamData(processedAssignedTeams);
        dispatch({ type: 'SET_ASSIGNED_TEAMS', payload: assignedTeamsWithTimestamps });
    }
    if (problemStatementsApi.data) {
        dispatch({ type: 'SET_PROBLEM_STATEMENTS', payload: problemStatementsApi.data });
    }
    if (judgesApi.data) {
        dispatch({ type: 'SET_JUDGES', payload: judgesApi.data });
    }
    if (scoresApi.data) {
        dispatch({ type: 'SET_SCORES', payload: scoresApi.data });
    } else if (state.currentStage?.stage_id !== 'stage_2') {
        // Clear scores when not in stage_2 to prevent showing old scores
        dispatch({ type: 'SET_SCORES', payload: [] });
    }
    if (judgingStagesApi.data) {
        dispatch({ type: 'SET_JUDGING_STAGES', payload: judgingStagesApi.data });
    }
    
    const error = allTeamsApi.error || assignedTeamsApi.error || problemStatementsApi.error || judgesApi.error || scoresApi.error || judgingStagesApi.error;
    if (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    } else {
        dispatch({ type: 'SET_ERROR', payload: null });
    }
  }, [
    allTeamsApi.data, allTeamsApi.isLoading, allTeamsApi.error,
    assignedTeamsApi.data, assignedTeamsApi.isLoading, assignedTeamsApi.error,
    problemStatementsApi.data, problemStatementsApi.isLoading, problemStatementsApi.error,
    judgesApi.data, judgesApi.isLoading, judgesApi.error,
    scoresApi.data, scoresApi.isLoading, scoresApi.error,
    judgingStagesApi.data, judgingStagesApi.isLoading, judgingStagesApi.error
  ]);

  useEffect(() => {
    if (state.judgingStages.length > 0 && !state.currentStage) {
      dispatch({ type: 'SET_CURRENT_STAGE', payload: state.judgingStages[0] });
    }
  }, [state.judgingStages, state.currentStage]);

  useEffect(() => {
    if (user?.email && state.judges.length > 0 && !state.selectedJudge) {
      const matchingJudge = state.judges.find(judge => {
        const judgeHasEmail = !!judge.email;
        const emailsMatch = judgeHasEmail && judge.email?.toLowerCase() === user.email?.toLowerCase();
        return emailsMatch;
      });
      
      if (matchingJudge) {
        dispatch({ type: 'SELECT_JUDGE', payload: matchingJudge });
      }
    }
  }, [state.judges, user?.email, state.selectedJudge]);
  
  return (
    <HackathonContext.Provider
      value={{
        state,
        dispatch,
        hasJudgeEvaluatedTeam,
        getTeamScore,
        refreshData,
        refreshProblemStatements,
        calculateAverageScores,
        getTeamScores,
        getJudgeScoreForTeam,
        shouldLockLeaderboard
      }}
    >
      {children}
    </HackathonContext.Provider>
  );
};

export const useHackathon = () => useContext(HackathonContext);