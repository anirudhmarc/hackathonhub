import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHackathon } from "@/contexts/HackathonContext";
import { Progress } from "@/components/ui/progress";
import { Team, TeamRanking } from "@/services/api";
import { TrackIcon } from "@/components/TrackIcon";
import { timestampService, TimestampData } from "@/services/timestampService";
import { Clock } from "lucide-react";

interface ResultsCardProps {
  team: TeamRanking;
  rank: number;
  stageId: string;
}

export const ResultsCard = ({ team, rank, stageId }: ResultsCardProps) => {
  const { state, calculateAverageScores, getTeamScores } = useHackathon();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [teamTimestamp, setTeamTimestamp] = useState<TimestampData | null>(null);

  useEffect(() => {
    if (detailsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [detailsOpen]);

  useEffect(() => {
    const loadTimestamp = async () => {
      await timestampService.loadTimestampData();
      const timestamp = timestampService.getTimestampForTeam(team.id);
      setTeamTimestamp(timestamp);
    };
    
    loadTimestamp();
  }, [team.id]);

  const handleCloseDialog = () => {
    setIsClosing(true);
    setTimeout(() => {
      setDetailsOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const avgScores = calculateAverageScores(team.id, stageId);
  const teamScores = getTeamScores(team.id, stageId);
  const totalJudges = new Set(teamScores.map((s) => s.judgeId)).size;

  const currentStage = state.judgingStages.find(stage => stage.stage_id === stageId);
  const isFinalRound = currentStage?.stage_name === 'Final Round';

  const teamNumber = `${team.id}`.split('-').pop();

  const getRankBadgeClass = () => {
    if (rank === 1) return "bg-yellow-500 shadow-lg shadow-yellow-200";
    if (rank === 2) return "bg-gray-400 shadow-md shadow-gray-200";
    if (rank === 3) return "bg-amber-700 shadow-md shadow-amber-200";
    return "bg-blue-600";
  };
  
  const getProblemTagColor = (problemId: string) => {
    const hash = problemId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const problemColors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
    ];
    const colorIndex = hash % problemColors.length;
    return problemColors[colorIndex];
  };
  
  const isTopThree = rank <= 3;
  
  return (
    <>
      <Card
        className={`cursor-pointer hover:shadow-xl hover:bg-gradient-to-br hover:from-white hover:to-accent/30 transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1 backdrop-blur-sm group
          ${isTopThree ? 'border-2 shadow-xl' : 'hover:border-primary/50'} 
          ${rank === 1 ? 'border-yellow-500 bg-gradient-to-br from-yellow-50/50 to-white shadow-yellow-100' : ''} 
          ${rank === 2 ? 'border-gray-400 bg-gradient-to-br from-gray-50/50 to-white shadow-gray-100' : ''} 
          ${rank === 3 ? 'border-amber-700 bg-gradient-to-br from-amber-50/50 to-white shadow-amber-100' : ''}`}
        onClick={() => setDetailsOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <div className={`${getRankBadgeClass()} h-12 w-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mr-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
              {rank}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl transition-all duration-300 group-hover:text-primary">{team.name}</CardTitle>
                    <div className="transition-transform duration-300 group-hover:scale-110">
                      <TrackIcon track={team.track?.trim() as 'student' | 'corporate'} size={20} className="ml-1" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="bg-gray-100 group-hover:bg-primary/10 text-gray-800 group-hover:text-primary text-xs font-medium px-2 py-1 rounded-full border border-gray-200 group-hover:border-primary/20 transition-all duration-300">
                      #{teamNumber}
                    </span>
                    {state.problemStatements.find(p => p.id === team.problem_id) && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getProblemTagColor(team.problem_id || 'default')}`}>
                        {state.problemStatements.find(p => p.id === team.problem_id)?.name || `Problem ${team.problem_id}`}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className={`text-3xl font-bold transition-all duration-300 group-hover:scale-110 ${rank === 1 ? 'text-yellow-500 group-hover:text-yellow-600' : rank === 2 ? 'text-gray-600 group-hover:text-gray-700' : rank === 3 ? 'text-amber-700 group-hover:text-amber-800' : 'text-primary group-hover:text-primary/80'}`}>
                    {team.total_score.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground transition-colors duration-300 group-hover:text-primary/70">
                    {team.judge_count} judge{team.judge_count !== 1 ? "s" : ""}
                  </div>
                  {((team as any).aws_funding_upvotes && (team as any).aws_funding_upvotes > 0) || 
                   ((team as any).aws_funding_downvotes && (team as any).aws_funding_downvotes > 0) ? (
                    <div className="flex items-center gap-1 mt-1 text-sm transition-all duration-300 group-hover:scale-105">
                      <span className="text-green-600 transition-all duration-300 hover:scale-125">{(team as any).aws_funding_upvotes || 0}👍</span>
                      <span className="mx-1">/</span>
                      <span className="text-red-600 transition-all duration-300 hover:scale-125">{(team as any).aws_funding_downvotes || 0}👎</span>
                    </div>
                  ) : null}
                  {isFinalRound && (((team as any).aws_special_award_yes && (team as any).aws_special_award_yes > 0) || 
                   ((team as any).aws_special_award_no && (team as any).aws_special_award_no > 0)) ? (
                    <div className="flex items-center gap-1 mt-1 text-sm transition-all duration-300 group-hover:scale-105">
                      <span className="text-purple-600 transition-all duration-300 hover:scale-125">{(team as any).aws_special_award_yes || 0}⭐</span>
                      <span className="mx-1">/</span>
                      <span className="text-gray-600 transition-all duration-300 hover:scale-125">{(team as any).aws_special_award_no || 0}⚪</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
        </CardContent>
      </Card>

      {detailsOpen && (
        <div 
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-500 ease-out ${isClosing ? 'opacity-0 backdrop-blur-0' : 'opacity-100'}`}
          onClick={handleCloseDialog}
        >
          <Card 
            className={`w-full max-w-[650px] max-h-[80vh] overflow-y-auto overscroll-contain shadow-2xl relative border-0 transition-all duration-500 ease-out ${isClosing ? 'scale-90 opacity-0 translate-y-8 rotate-1' : 'scale-100 opacity-100 translate-y-0 rotate-0'}`}
            onClick={(e) => e.stopPropagation()}
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.95) 100%)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
          >
            <button 
              onClick={handleCloseDialog} 
              className="absolute top-3 right-3 h-10 w-10 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-300 hover:scale-125 hover:rotate-90 z-10 bg-white/80 backdrop-blur-sm shadow-lg border border-gray-200 hover:border-red-300 hover:shadow-xl group active:scale-95"
              aria-label="Close dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <TrackIcon track={team.track?.trim() as 'student' | 'corporate'} size={36} />
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <span>{team.name}</span>
                      <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2 py-1 rounded-full">
                        #{teamNumber}
                      </span>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      <strong>Problem Statement:</strong> {state.problemStatements.find(p => p.id === team.problem_id)?.name || `Problem ${team.problem_id}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold ${rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-600' : rank === 3 ? 'text-amber-700' : 'text-primary'}`}>
                    {team.total_score.toFixed(1)}
                  </span>
                  {rank <= 3 && (
                    <div className={`ml-1 ${rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-500' : 'text-amber-700'}`}>
                      {rank === 1 ? '🏆' : rank === 2 ? '🥈' : '🥉'}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 text-left">
            
            {teamTimestamp && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Submission Time
                </h4>
                <div className="text-sm">
                  <span className="font-medium text-blue-900">
                    {new Date(teamTimestamp.last_updated).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} at {new Date(teamTimestamp.last_updated).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <h3 className="font-semibold flex items-center">
                Rank:{" "}
                <span
                  className={`inline-block ${getRankBadgeClass()} text-white px-3 py-1 rounded-full text-sm ml-2`}
                >
                  #{rank}
                </span>
                {rank <= 3 && (
                  <span className="ml-2 text-lg">
                    {rank === 1 ? '🏆' : rank === 2 ? '🥈' : '🥉'}
                  </span>
                )}
              </h3>
              <div className="text-sm text-muted-foreground">
                Evaluated by {totalJudges} judge{totalJudges !== 1 ? "s" : ""}
              </div>
            </div>

              <div className="space-y-3 mt-4">
              <h4 className="font-medium">Average Scores:</h4>
              <ScoreRow
                label="Novelty"
                score={avgScores.innovation}
                maxScore={isFinalRound ? 20 : 30}
              />
              <ScoreRow
                label="Impact"
                score={avgScores.impact}
                maxScore={isFinalRound ? 20 : 30}
              />
              <ScoreRow
                label="Implementation"
                score={avgScores.technicalComplexity}
                maxScore={isFinalRound ? 40 : 40}
              />
              {isFinalRound && (
                <ScoreRow
                  label="Presentation"
                  score={avgScores.presentation}
                  maxScore={20}
                />
              )}
              
              <div className="pt-4 border-t mt-4">
                <h4 className="font-medium mb-3">Individual Judge Scores:</h4>
                <div className="space-y-4">
                  {teamScores.length > 0 ? (
                    teamScores.map((score) => (
                      <div key={score.judgeId} className="bg-gradient-to-r from-muted/30 to-muted/50 p-4 rounded-lg border border-muted transition-all duration-300 hover:shadow-lg hover:scale-[1.01] hover:border-primary/20 group">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium text-foreground transition-colors duration-300 group-hover:text-primary">{score.judgeName}</span>
                        </div>
                        <div className={`grid ${isFinalRound ? 'grid-cols-2' : 'grid-cols-2'} gap-x-4 gap-y-3 text-sm`}>
                          <div className="flex justify-between items-center p-2 bg-white/50 rounded-md transition-all duration-200 hover:bg-white/70">
                            <span className="flex items-center gap-2">💡 <span>Novelty:</span></span>
                            <span className="font-semibold text-primary">{score.innovation}/{isFinalRound ? 20 : 30}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white/50 rounded-md transition-all duration-200 hover:bg-white/70">
                            <span className="flex items-center gap-2">⚡ <span>Implementation:</span></span>
                            <span className="font-semibold text-primary">{score.technicalComplexity}/{isFinalRound ? 40 : 40}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white/50 rounded-md transition-all duration-200 hover:bg-white/70">
                            <span className="flex items-center gap-2">📈 <span>Impact:</span></span>
                            <span className="font-semibold text-primary">{score.impact}/{isFinalRound ? 20 : 30}</span>
                          </div>
                          
                          {isFinalRound && (
                            <div className="flex justify-between items-center p-2 bg-white/50 rounded-md transition-all duration-200 hover:bg-white/70">
                              <span className="flex items-center gap-2">🎤 <span>Presentation:</span></span>
                              <span className="font-semibold text-primary">{score.presentation}/20</span>
                            </div>
                          )}
                        </div>
                        
                        
                        {(score.feedback || score.strength || score.improvement) && (
                          <div className="space-y-2 mt-2 pt-2 border-t text-sm">
                            {score.feedback && (
                              <div>
                                <span className="font-medium">Feedback:</span>
                                <p className="text-muted-foreground">{score.feedback}</p>
                              </div>
                            )}
                            {score.strength && !score.strength.startsWith('AWS_SPECIAL_AWARD:') && (
                              <div>
                                <span className="font-medium">Strength:</span>
                                <p className="text-muted-foreground">{score.strength}</p>
                              </div>
                            )}
                            {score.improvement && (
                              <div>
                                <span className="font-medium">Improvement:</span>
                                <p className="text-muted-foreground">{score.improvement}</p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-3">
                          {score.aws_funding_vote && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed">
                              <span className="text-sm font-medium">AWS Funding:</span>
                              {score.aws_funding_vote === 'upvote' ? (
                                <span className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 hover:bg-green-100 hover:scale-105">
                                  <span className="text-lg">👍</span> Recommended
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 hover:bg-red-100 hover:scale-105">
                                  <span className="text-lg">👎</span> Not Recommended
                                </span>
                              )}
                            </div>
                          )}

                          
                          {isFinalRound && score.strength && score.strength.startsWith('AWS_SPECIAL_AWARD:') && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed">
                              <span className="text-sm font-medium">AWS Special Award:</span>
                              {score.strength === 'AWS_SPECIAL_AWARD:true' ? (
                                <span className="flex items-center gap-2 text-purple-600 bg-purple-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 hover:bg-purple-100 hover:scale-105">
                                  <span className="text-lg">⭐</span> Recommended
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 hover:bg-gray-100 hover:scale-105">
                                  <span className="text-lg">⚪</span> Not Recommended
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No scores submitted yet.</p>
                  )}
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

interface ScoreRowProps {
  label: string;
  score: number;
  maxScore: number;
}

const ScoreRow = ({ label, score, maxScore }: ScoreRowProps) => {
  const getScoreColor = () => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = () => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="group p-3 rounded-lg bg-white/50 border border-muted/30 transition-all duration-300 hover:bg-white/70 hover:shadow-md hover:border-primary/20">
      <div className="flex justify-between items-center text-sm mb-2">
        <span className="font-medium transition-colors duration-300 group-hover:text-primary">{label}</span>
        <span className={`font-bold text-lg transition-all duration-300 group-hover:scale-105 ${getScoreColor()}`}>
          {score.toFixed(1)}/{maxScore}
        </span>
      </div>
      <div className="relative">
        <Progress
          value={(score / maxScore) * 100}
          className="h-3 transition-all duration-500 group-hover:h-4"
        />
        <div 
          className={`absolute top-0 left-0 h-3 group-hover:h-4 rounded-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${(score / maxScore) * 100}%` }}
        />
      </div>
    </div>
  );
};