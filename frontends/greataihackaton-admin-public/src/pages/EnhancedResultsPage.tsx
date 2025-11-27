import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Trophy,
  Star,
  Users,
  Target,
  Zap,
  Award,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Filter,
  Loader2,
  Crown,
  Medal,
  FlameKindling
} from 'lucide-react';
import axios, { isAxiosError } from 'axios';

interface Team {
  id: string;
  name: string;
  track_name?: string;
  problem_id?: string;
  team_number?: number;
  is_finalist?: boolean;
}

interface Score {
  team_id: string;
  judge_id: string;
  innovation: number;
  technical_complexity: number;
  impact: number;
  presentation: number;
  aws_funding_vote: 'upvote' | 'downvote' | null;
  stage_id: string;
}

interface JudgingStage {
  stage_id: string;
  stage_name: string;
}

interface EnhancedTeam extends Team {
  total_score: number;
  avg_innovation: number;
  avg_technical_complexity: number;
  avg_impact: number;
  avg_presentation: number;
  aws_funding_upvotes: number;
  aws_funding_downvotes: number;
  judge_count: number;
  rank: number;
}

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;

const EnhancedResultsPage: React.FC = () => {
  const { idToken } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'podium' | 'detailed' | 'analytics'>('overview');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchData = async () => {
    if (!idToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_GATEWAY_BASE_URL}/admin/leaderboard`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });

      const { teams, scores, judgingStages } = response.data;
      
      setTeams(teams);
      setScores(scores);

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
  }, [idToken]);

  const enhancedRankings: EnhancedTeam[] = useMemo(() => {
    if (!teams || !scores || !stageFilter) return [];

    const rankings = teams
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
            aws_funding_upvotes: 0,
            aws_funding_downvotes: 0,
            judge_count: 0,
            rank: 0,
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
        
        const awsFundingUpvotes = teamScores.filter(score => score.aws_funding_vote === 'upvote').length;
        const awsFundingDownvotes = teamScores.filter(score => score.aws_funding_vote === 'downvote').length;

        return {
          ...team,
          total_score: totalScore,
          avg_innovation: avgInnovation,
          avg_technical_complexity: avgTechnicalComplexity,
          avg_impact: avgImpact,
          avg_presentation: avgPresentation,
          aws_funding_upvotes: awsFundingUpvotes,
          aws_funding_downvotes: awsFundingDownvotes,
          judge_count: judgeCount,
          track_name: team.track_name && team.track_name.trim() !== '' ? team.track_name : '-',
          rank: 0,
        };
      })
      .sort((a, b) => b.total_score - a.total_score)
      .map((team, index) => ({ ...team, rank: index + 1 }));

    return rankings;
  }, [teams, scores, stageFilter]);

  const filteredRankings: EnhancedTeam[] = useMemo(() => {
    if (selectedTrack === 'all') return enhancedRankings;
    return enhancedRankings.filter(team => 
      team.track_name?.toLowerCase().includes(selectedTrack.toLowerCase())
    );
  }, [enhancedRankings, selectedTrack]);

  const availableTracks = useMemo(() => {
    const tracks = new Set(teams
      .map(team => team.track_name)
      .filter((track): track is string => !!track && track.trim() !== '')
    );
    return Array.from(tracks).sort();
  }, [teams]);

  const analytics = useMemo(() => {
    const totalTeams = filteredRankings.length;
    const avgScore = filteredRankings.reduce((sum, team) => sum + team.total_score, 0) / totalTeams;
    const highestScore = filteredRankings[0]?.total_score || 0;
    const totalJudges = new Set(scores.map(score => score.judge_id)).size;
    
    return {
      totalTeams,
      avgScore: avgScore || 0,
      highestScore,
      totalJudges,
      competitiveness: (highestScore - avgScore) / avgScore || 0
    };
  }, [filteredRankings, scores]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlay && viewMode === 'podium') {
      interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % Math.min(filteredRankings.length, 10));
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPlay, viewMode, filteredRankings.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2: return <Medal className="h-6 w-6 text-gray-400" />;
      case 3: return <Medal className="h-6 w-6 text-amber-600" />;
      default: return <Trophy className="h-5 w-5 text-blue-500" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 via-yellow-500 to-yellow-600';
      case 2: return 'from-gray-300 via-gray-400 to-gray-500';
      case 3: return 'from-amber-500 via-amber-600 to-amber-700';
      default: return 'from-blue-500 via-blue-600 to-blue-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-2xl text-white font-light">Loading Enhanced Results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex justify-center items-center">
        <Card className="max-w-md bg-red-950/50 border-red-500">
          <CardContent className="text-center p-8">
            <FlameKindling className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Error Loading Results</h2>
            <p className="text-red-200 mb-6">{error}</p>
            <Button onClick={fetchData} className="bg-red-600 hover:bg-red-700">
              <RotateCcw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className="flex justify-between items-center mb-6 px-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🏆 Hackathon Champions
          </h1>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {filteredRankings.length} Teams
          </Badge>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant={viewMode === 'overview' ? 'default' : 'ghost'}
            onClick={() => setViewMode('overview')}
            className="text-sm"
          >
            <Users className="mr-2 h-4 w-4" /> Overview
          </Button>
          <Button
            variant={viewMode === 'podium' ? 'default' : 'ghost'}
            onClick={() => setViewMode('podium')}
            className="text-sm"
          >
            <Trophy className="mr-2 h-4 w-4" /> Podium
          </Button>
          <Button
            variant={viewMode === 'detailed' ? 'default' : 'ghost'}
            onClick={() => setViewMode('detailed')}
            className="text-sm"
          >
            <Target className="mr-2 h-4 w-4" /> Detailed
          </Button>
          <Button
            variant={viewMode === 'analytics' ? 'default' : 'ghost'}
            onClick={() => setViewMode('analytics')}
            className="text-sm"
          >
            <Zap className="mr-2 h-4 w-4" /> Analytics
          </Button>
          
          <div className="border-l border-gray-600 pl-3">
            <Button
              variant="ghost"
              onClick={toggleFullscreen}
              className="text-sm"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      
      <div className="flex justify-center mb-6">
        <div className="flex items-center space-x-2 bg-black/20 rounded-full p-2">
          <Filter className="h-4 w-4 text-purple-300" />
          {['all', ...availableTracks].map((track) => (
            <Button
              key={track}
              variant={selectedTrack === track ? 'default' : 'ghost'}
              onClick={() => setSelectedTrack(track)}
              className="rounded-full text-sm"
            >
              {track === 'all' ? 'All Tracks' : track}
            </Button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto">
        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRankings.slice(0, 12).map((team) => (
              <Card key={team.id} className={`bg-gradient-to-br ${getRankColor(team.rank)} transform hover:scale-105 transition-all duration-300 shadow-2xl`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      {getRankIcon(team.rank)}
                      <span className="text-2xl font-bold text-white">#{team.rank}</span>
                    </div>
                    <Badge className="bg-black/40 text-white border-purple-400/50">
                      {team.track_name || 'No Track'}
                    </Badge>
                  </div>
                  <CardTitle className="text-white text-xl">{team.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Total Score</span>
                      <span className="text-2xl font-bold text-white">{team.total_score.toFixed(1)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center space-x-1">
                        <Zap className="h-3 w-3" />
                        <span>Novelty: {team.avg_innovation.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Target className="h-3 w-3" />
                        <span>Impact: {team.avg_impact.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3" />
                        <span>Implementation: {team.avg_technical_complexity.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {viewMode === 'podium' && (
          <div className="text-center">
            <div className="flex justify-center items-center space-x-4 mb-8">
              <Button
                variant="ghost"
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className="bg-purple-600/80 hover:bg-purple-700/90 text-white border border-purple-400"
              >
                {isAutoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold">
                {currentSlide + 1} / {Math.min(filteredRankings.length, 10)}
              </span>
              <Button
                variant="ghost"
                onClick={() => setCurrentSlide(prev => Math.min(filteredRankings.length - 1, prev + 1))}
                disabled={currentSlide >= Math.min(filteredRankings.length, 10) - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {filteredRankings[currentSlide] && (
              <Card className={`max-w-2xl mx-auto bg-gradient-to-br ${getRankColor(filteredRankings[currentSlide].rank)} shadow-2xl transform scale-110`}>
                <CardHeader className="text-center pb-6">
                  <div className="flex justify-center items-center space-x-4 mb-4">
                    {getRankIcon(filteredRankings[currentSlide].rank)}
                    <span className="text-6xl font-bold text-white">#{filteredRankings[currentSlide].rank}</span>
                  </div>
                  <CardTitle className="text-4xl text-white mb-2">{filteredRankings[currentSlide].name}</CardTitle>
                  <Badge className="bg-black/40 text-white border-purple-400/50 text-lg px-4 py-2">
                    {filteredRankings[currentSlide].track_name || 'No Track'}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-white mb-2">
                      {filteredRankings[currentSlide].total_score.toFixed(1)}
                    </div>
                    <div className="text-xl text-white/80">Total Score</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Zap className="h-5 w-5 text-yellow-300" />
                        <span className="text-white font-semibold">Innovation</span>
                      </div>
                      <div className="text-3xl font-bold text-white">{filteredRankings[currentSlide].avg_innovation.toFixed(1)}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Star className="h-5 w-5 text-blue-300" />
                        <span className="text-white font-semibold">Implementation</span>
                      </div>
                      <div className="text-3xl font-bold text-white">{filteredRankings[currentSlide].avg_technical_complexity.toFixed(1)}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center items-center space-x-8">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Target className="h-5 w-5 text-green-300" />
                        <span className="text-white font-semibold">Impact</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{filteredRankings[currentSlide].avg_impact.toFixed(1)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white">{filteredRankings[currentSlide].judge_count}</div>
                      <div className="text-sm text-white/80">Judges</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {viewMode === 'detailed' && (
          <div className="space-y-4">
            {filteredRankings.slice(0, 20).map((team) => (
              <Card key={team.id} className="bg-black/40 border-purple-500/30 hover:border-purple-400 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getRankIcon(team.rank)}
                      <div>
                        <h3 className="text-xl font-bold text-white">{team.name}</h3>
                        <p className="text-purple-300">{team.track_name || 'No Track'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{team.total_score.toFixed(1)}</div>
                        <div className="text-sm text-gray-400">Total Score</div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold text-yellow-400">{team.avg_innovation.toFixed(1)}</div>
                          <div className="text-xs text-gray-400">Innovation</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-blue-400">{team.avg_technical_complexity.toFixed(1)}</div>
                          <div className="text-xs text-gray-400">Implementation</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-green-400">{team.avg_impact.toFixed(1)}</div>
                          <div className="text-xs text-gray-400">Impact</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-purple-400">{team.avg_presentation.toFixed(1)}</div>
                          <div className="text-xs text-gray-400">Presentation</div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-300">{team.judge_count}</div>
                        <div className="text-xs text-gray-400">Judge Count</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Total Teams</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{analytics.totalTeams}</div>
                <div className="text-blue-200">Competing</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-600 to-green-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Average Score</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{analytics.avgScore.toFixed(1)}</div>
                <div className="text-green-200">Out of 40</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-yellow-600 to-yellow-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Highest Score</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{analytics.highestScore.toFixed(1)}</div>
                <div className="text-yellow-200">Achievement</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Total Judges</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{analytics.totalJudges}</div>
                <div className="text-purple-200">Evaluating</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedResultsPage;