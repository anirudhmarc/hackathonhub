import { useEffect, useState, memo, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useHackathon } from '@/contexts/HackathonContext';
import { submitScore } from '@/services/api';
import { Input } from '@/components/ui/input';
import { FileIcon, ImageIcon, GitlabIcon, Github, Code, VideoIcon, Link, TrendingUp, MessageSquare, Lightbulb, Award, Target, Zap, Clock } from 'lucide-react';
import { isReadOnlyMode, isReadOnlyForStage, getScoringEndDate } from '@/utils/readOnlyMode';
import { getScoringTimeStatus, isScoringActive } from '@/utils/scoringDateTimeControl';
import { RubricPanel } from '@/components/RubricPanel';

const SCORING_END_DATE = getScoringEndDate();

const dateTimeWithZoneFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kuala_Lumpur',
  timeZoneName: 'short'
});

const formatWithGmt8 = (d: Date) => {
  const s = dateTimeWithZoneFormatter.format(d);
  return s.replace(/(GMT\+0?8(?::00)?|GMT\+08:00|MYT|\+08:00)/g, 'GMT+8');
};

interface ScoringCardProps {
  team: {
    id: string;
    name: string;
    team_number?: string;
    last_updated?: string;
    submission_group?: string;
    track: string;
    problem_id: string | null;
    problem_statement: string | null;
    submission_video_url?: string | null;
    submission_project_description?: string | null;
    github_url?: string | null;
    submission_additional_materials_url?: string | null;
  };
  problemStatement: string;
  problemId: string | null;
  track: string;
  hasBeenEvaluated: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export const ScoringCard = memo(({
  team,
  problemStatement,
  problemId,
  track,
  hasBeenEvaluated,
  disabled = false,
  disabledReason,
}: ScoringCardProps) => {
  const { toast } = useToast();
  const { state, dispatch, refreshData, getJudgeScoreForTeam } = useHackathon();
  const { selectedJudge, currentStage } = state;

  const problemColor = useMemo(() => {
    const hash = typeof problemId === 'string' ? problemId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
    ];
    return colors[hash % colors.length];
  }, [problemId]);

  const teamNumber = useMemo(() => String(team.id).split('-').pop(), [team.id]);

  const additionalMaterials = useMemo(() => {
    if (!team.submission_additional_materials_url) return [];
    try {
      const parsed = JSON.parse(team.submission_additional_materials_url);
      return Array.isArray(parsed) ? parsed : [team.submission_additional_materials_url];
    } catch {
      return [team.submission_additional_materials_url];
    }
  }, [team.submission_additional_materials_url]);

  const effectiveVideoUrl = useMemo(() => {
    return team.submission_video_url || null;
  }, [team.submission_video_url]);

  const isPlaceholderVideo = useCallback((videoUrl: string | null | undefined): boolean => {
    if (!videoUrl) return true;
    
    const placeholders = [
      "https://placeholder.video/no-video-uploaded",
      "-",
      "",
      "https://example.com/null",
      "no-video",
      "placeholder"
    ];
    
    return placeholders.some(placeholder => 
      videoUrl === placeholder || videoUrl.includes("placeholder")
    );
  }, []);
  
  const getFileNameFromUrl = useCallback((url: string): string => {
    try {
      const urlObject = new URL(url);
      const pathname = urlObject.pathname;
      const parts = pathname.split('/');
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (e) {
      return url;
    }
  }, []);

  const getFileExtension = useCallback((url: string): string | null => {
    try {
      const urlObject = new URL(url);
      const pathname = urlObject.pathname;
      const idx = pathname.lastIndexOf('.');
      if (idx === -1) return null;
      return pathname.slice(idx + 1).toLowerCase();
    } catch (e) {
      const idx = url.lastIndexOf('.');
      if (idx === -1) return null;
      const ext = url.slice(idx + 1).split(/[?#]/)[0];
      return ext ? ext.toLowerCase() : null;
    }
  }, []);

  const videoExt = useMemo(() => getFileExtension(effectiveVideoUrl || '') || '', [effectiveVideoUrl, getFileExtension]);
  
  const getFileIcon = useCallback((url: string) => {
    if (url.includes('.mp4') || url.includes('.mov')) return <VideoIcon className="h-4 w-4" />;
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.gif')) return <ImageIcon className="h-4 w-4" />;
    if (url.includes('.pdf')) return <FileIcon className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  }, []);

  const [videoHasVisual, setVideoHasVisual] = useState<boolean | null>(null);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget as HTMLVideoElement;
    const hasVisual = !!(v.videoWidth && v.videoHeight);
    setVideoHasVisual(hasVisual);
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoLoadError('Failed to load video in browser.');
    setVideoHasVisual(false);
  }, []);

  const outputFileName = useMemo(() => {
    const name = getFileNameFromUrl(effectiveVideoUrl || '');
    if (!name) return 'output.mp4';
    const base = name.replace(/\.[^/.]+$/, '');
    const clean = base.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '');
    return `${clean}.mp4`;
  }, [effectiveVideoUrl, getFileNameFromUrl]);

  const transcodeCommand = useMemo(() => {
    const input = getFileNameFromUrl(effectiveVideoUrl || 'input.mov');
    return `ffmpeg -i "${input}" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k "${outputFileName}"`;
  }, [effectiveVideoUrl, getFileNameFromUrl, outputFileName]);

  const handleCopyTranscode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(transcodeCommand);
      toast({ title: 'Copied', description: 'Transcode command copied to clipboard.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to copy command to clipboard.', variant: 'destructive' });
    }
  }, [transcodeCommand, toast]);

  const handleCopyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Copied', description: 'S3 URL copied to clipboard.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to copy URL.', variant: 'destructive' });
    }
  }, [toast]);

  const [innovation, setInnovation] = useState(1);
  const [technicalComplexity, setTechnicalComplexity] = useState(1);
  const [impact, setImpact] = useState(1);
  const [presentation, setPresentation] = useState(1);
  const [feedback, setFeedback] = useState('');
  const [strength, setStrength] = useState('');
  const [improvement, setImprovement] = useState('');
  const [awsFundingVote, setAwsFundingVote] = useState<'upvote' | 'downvote' | null>(null);
  const [awsSpecialAward, setAwsSpecialAward] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isFinalRound, setIsFinalRound] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<Record<string, { saving: boolean; lastSaved: Date | null }>>({});
    
  useEffect(() => {
    if (currentStage) {
      setIsFinalRound(currentStage.stage_name === 'Final Round');
    }
  }, [currentStage]);

  const scoringClosed = isReadOnlyForStage(currentStage?.stage_name ?? null);
  
  const globalScoringStatus = getScoringTimeStatus();
  const isGlobalScoringBlocked = !globalScoringStatus.canScore;
  
  // Block scoring for final round (stage_2) to make it view-only
  const isFinalRoundBlocked = currentStage?.stage_id === 'stage_2';
  
  const isScoringBlocked = scoringClosed || isGlobalScoringBlocked || isFinalRoundBlocked;

  const getAutoSaveKey = useCallback((field: string) => {
    if (!selectedJudge || !currentStage) return null;
    return `autosave_${selectedJudge.id}_${team.id}_${currentStage.stage_id}_${field}`;
  }, [selectedJudge, team.id, currentStage]);

  const loadAutoSavedData = useCallback(() => {
    if (selectedJudge && currentStage) {
      const feedbackKey = getAutoSaveKey('feedback');
      const strengthKey = getAutoSaveKey('strength');
      const improvementKey = getAutoSaveKey('improvement');
      const innovationKey = getAutoSaveKey('innovation');
      const technicalKey = getAutoSaveKey('technical_complexity');
      const impactKey = getAutoSaveKey('impact');
      const presentationKey = getAutoSaveKey('presentation');
      const awsVoteKey = getAutoSaveKey('aws_funding_vote');
      const awsSpecialAwardKey = getAutoSaveKey('aws_special_award');

      if (feedbackKey) {
        const savedFeedback = localStorage.getItem(feedbackKey);
        if (savedFeedback) setFeedback(savedFeedback);
      }
      if (strengthKey) {
        const savedStrength = localStorage.getItem(strengthKey);
        if (savedStrength) setStrength(savedStrength);
      }
      if (improvementKey) {
        const savedImprovement = localStorage.getItem(improvementKey);
        if (savedImprovement) setImprovement(savedImprovement);
      }
      if (innovationKey) {
        const saved = localStorage.getItem(innovationKey);
        if (saved && !isNaN(Number(saved))) setInnovation(Number(saved));
      }
      if (technicalKey) {
        const saved = localStorage.getItem(technicalKey);
        if (saved && !isNaN(Number(saved))) setTechnicalComplexity(Number(saved));
      }
      if (impactKey) {
        const saved = localStorage.getItem(impactKey);
        if (saved && !isNaN(Number(saved))) setImpact(Number(saved));
      }
      if (presentationKey) {
        const saved = localStorage.getItem(presentationKey);
        if (saved && !isNaN(Number(saved))) setPresentation(Number(saved));
      }
      if (awsVoteKey) {
        const saved = localStorage.getItem(awsVoteKey);
        if (saved === 'upvote' || saved === 'downvote') setAwsFundingVote(saved as 'upvote' | 'downvote');
      }
      if (awsSpecialAwardKey) {
        const saved = localStorage.getItem(awsSpecialAwardKey);
        if (saved === 'true') setAwsSpecialAward(true);
        else if (saved === 'false') setAwsSpecialAward(false);
      }
    }
  }, [selectedJudge, currentStage, team.id, getAutoSaveKey]);

  const loadExistingScore = useCallback(() => {
    if (selectedJudge && getJudgeScoreForTeam && currentStage) {
      const previousScore = getJudgeScoreForTeam(selectedJudge.id, team.id, currentStage.stage_id);
      if (previousScore) {
        // All four criteria are scored 1-10 in every round.
        setInnovation(Math.min(previousScore.innovation || 1, 10));
        setImpact(Math.min(previousScore.impact || 1, 10));
        setTechnicalComplexity(Math.min(previousScore.technical_complexity || 1, 10));
        setPresentation(Math.min(previousScore.presentation || 1, 10));
        if (isFinalRound && previousScore.strength) {
          const strengthText = previousScore.strength;
          if (strengthText.startsWith('AWS_SPECIAL_AWARD:')) {
            const awsSpecialValue = strengthText.replace('AWS_SPECIAL_AWARD:', '');
            setAwsSpecialAward(awsSpecialValue === 'true' ? true : awsSpecialValue === 'false' ? false : null);
            setStrength('');
          } else {
            setStrength(strengthText);
            setAwsSpecialAward(null);
          }
        } else {
          setStrength(previousScore.strength || '');
          setAwsSpecialAward(null);
        }
        setFeedback(previousScore.feedback || '');
        setAwsFundingVote(previousScore.aws_funding_vote || null);
        setImprovement(previousScore.improvement || '');
      } else {
        setInnovation(1);
        setTechnicalComplexity(1);
        setImpact(1);
        setPresentation(1);
        setFeedback('');
        setAwsFundingVote(null);
        setAwsSpecialAward(null);
        setStrength('');
        setImprovement('');
        loadAutoSavedData();
      }
    }
  }, [selectedJudge, team.id, getJudgeScoreForTeam, currentStage, loadAutoSavedData, isFinalRound]);

  useEffect(() => {
    if (!isOpen || !selectedJudge || !currentStage) return;
    
    const feedbackKey = getAutoSaveKey('feedback');
    if (feedbackKey && feedback) {
      setAutosaveStatus(prev => ({ ...prev, feedback: { ...(prev.feedback || { saving: false, lastSaved: null }), saving: true, lastSaved: prev.feedback?.lastSaved || null } }));
      const timer = setTimeout(() => {
        localStorage.setItem(feedbackKey, feedback);
        setAutosaveStatus(prev => ({ ...prev, feedback: { saving: false, lastSaved: new Date() } }));
      }, 1000);

      return () => {
        clearTimeout(timer);
        setAutosaveStatus(prev => ({ ...prev, feedback: { ...(prev.feedback || { saving: false, lastSaved: null }), saving: false } }));
      };
    }
  }, [feedback, isOpen, selectedJudge, currentStage, getAutoSaveKey]);

  useEffect(() => {
    if (!isOpen || !selectedJudge || !currentStage) return;
    
    const strengthKey = getAutoSaveKey('strength');
    if (strengthKey && strength) {
      setAutosaveStatus(prev => ({ ...prev, strength: { ...(prev.strength || { saving: false, lastSaved: null }), saving: true, lastSaved: prev.strength?.lastSaved || null } }));
      const timer = setTimeout(() => {
        localStorage.setItem(strengthKey, strength);
        setAutosaveStatus(prev => ({ ...prev, strength: { saving: false, lastSaved: new Date() } }));
      }, 1000);

      return () => {
        clearTimeout(timer);
        setAutosaveStatus(prev => ({ ...prev, strength: { ...(prev.strength || { saving: false, lastSaved: null }), saving: false } }));
      };
    }
  }, [strength, isOpen, selectedJudge, currentStage, getAutoSaveKey]);

  useEffect(() => {
    if (!isOpen || !selectedJudge || !currentStage) return;
    
    const improvementKey = getAutoSaveKey('improvement');
    if (improvementKey && improvement) {
      setAutosaveStatus(prev => ({ ...prev, improvement: { ...(prev.improvement || { saving: false, lastSaved: null }), saving: true, lastSaved: prev.improvement?.lastSaved || null } }));
      const timer = setTimeout(() => {
        localStorage.setItem(improvementKey, improvement);
        setAutosaveStatus(prev => ({ ...prev, improvement: { saving: false, lastSaved: new Date() } }));
      }, 1000);

      return () => {
        clearTimeout(timer);
        setAutosaveStatus(prev => ({ ...prev, improvement: { ...(prev.improvement || { saving: false, lastSaved: null }), saving: false } }));
      };
    }
  }, [improvement, isOpen, selectedJudge, currentStage, getAutoSaveKey]);

  useEffect(() => {
    if (!isOpen || !selectedJudge || !currentStage) return;
    const key = getAutoSaveKey('innovation');
    if (key && innovation !== undefined) {
      setAutosaveStatus(prev => ({ ...prev, innovation: { ...(prev.innovation || { saving: false, lastSaved: null }), saving: true, lastSaved: prev.innovation?.lastSaved || null } }));
      const t = setTimeout(() => {
        localStorage.setItem(key, String(innovation));
        setAutosaveStatus(prev => ({ ...prev, innovation: { saving: false, lastSaved: new Date() } }));
      }, 1000);
      return () => { clearTimeout(t); setAutosaveStatus(prev => ({ ...prev, innovation: { ...(prev.innovation || { saving: false, lastSaved: null }), saving: false } })); };
    }
  }, [innovation, isOpen, selectedJudge, currentStage, getAutoSaveKey]);

  useEffect(() => {
    if (!isOpen || !selectedJudge || !currentStage) return;
    const key = getAutoSaveKey('technical_complexity');
    if (key && technicalComplexity !== undefined) {
      setAutosaveStatus(prev => ({ ...prev, technical_complexity: { ...(prev.technical_complexity || { saving: false, lastSaved: null }), saving: true, lastSaved: prev.technical_complexity?.lastSaved || null } }));
      const t = setTimeout(() => {
        localStorage.setItem(key, String(technicalComplexity));
        setAutosaveStatus(prev => ({ ...prev, technical_complexity: { saving: false, lastSaved: new Date() } }));
      }, 1000);
      return () => { clearTimeout(t); setAutosaveStatus(prev => ({ ...prev, technical_complexity: { ...(prev.technical_complexity || { saving: false, lastSaved: null }), saving: false } })); };
    }
  }, [technicalComplexity, isOpen, selectedJudge, currentStage, getAutoSaveKey]);

  useEffect(() => {
    if (!isOpen || !selectedJudge || !currentStage) return;
    const key = getAutoSaveKey('impact');
    if (key && impact !== undefined) {
      setAutosaveStatus(prev => ({ ...prev, impact: { ...(prev.impact || { saving: false, lastSaved: null }), saving: true, lastSaved: prev.impact?.lastSaved || null } }));
      const t = setTimeout(() => {
        localStorage.setItem(key, String(impact));
        setAutosaveStatus(prev => ({ ...prev, impact: { saving: false, lastSaved: new Date() } }));
      }, 1000);
      return () => { clearTimeout(t); setAutosaveStatus(prev => ({ ...prev, impact: { ...(prev.impact || { saving: false, lastSaved: null }), saving: false } })); };
    }
  }, [impact, isOpen, selectedJudge, currentStage, getAutoSaveKey]);

  useEffect(() => {
    if (!isOpen || !selectedJudge || !currentStage) return;
    const key = getAutoSaveKey('presentation');
    if (key && presentation !== undefined) {
      setAutosaveStatus(prev => ({ ...prev, presentation: { ...(prev.presentation || { saving: false, lastSaved: null }), saving: true, lastSaved: prev.presentation?.lastSaved || null } }));
      const t = setTimeout(() => {
        localStorage.setItem(key, String(presentation));
        setAutosaveStatus(prev => ({ ...prev, presentation: { saving: false, lastSaved: new Date() } }));
      }, 1000);
      return () => { clearTimeout(t); setAutosaveStatus(prev => ({ ...prev, presentation: { ...(prev.presentation || { saving: false, lastSaved: null }), saving: false } })); };
    }
  }, [presentation, isOpen, selectedJudge, currentStage, getAutoSaveKey]);

  useEffect(() => {
    if (!isOpen || !selectedJudge || !currentStage) return;
    const key = getAutoSaveKey('aws_funding_vote');
    if (key) {
      setAutosaveStatus(prev => ({ ...prev, aws_funding_vote: { ...(prev.aws_funding_vote || { saving: false, lastSaved: null }), saving: true, lastSaved: prev.aws_funding_vote?.lastSaved || null } }));
      const t = setTimeout(() => {
        if (awsFundingVote === null) localStorage.removeItem(key);
        else localStorage.setItem(key, awsFundingVote);
        setAutosaveStatus(prev => ({ ...prev, aws_funding_vote: { saving: false, lastSaved: new Date() } }));
      }, 400);
      return () => { clearTimeout(t); setAutosaveStatus(prev => ({ ...prev, aws_funding_vote: { ...(prev.aws_funding_vote || { saving: false, lastSaved: null }), saving: false } })); };
    }
  }, [awsFundingVote, isOpen, selectedJudge, currentStage, getAutoSaveKey]);

  useEffect(() => {
    if (!isOpen || !selectedJudge || !currentStage) return;
    const key = getAutoSaveKey('aws_special_award');
    if (key) {
      setAutosaveStatus(prev => ({ ...prev, aws_special_award: { ...(prev.aws_special_award || { saving: false, lastSaved: null }), saving: true, lastSaved: prev.aws_special_award?.lastSaved || null } }));
      const t = setTimeout(() => {
        if (awsSpecialAward === null) localStorage.removeItem(key);
        else localStorage.setItem(key, String(awsSpecialAward));
        setAutosaveStatus(prev => ({ ...prev, aws_special_award: { saving: false, lastSaved: new Date() } }));
      }, 400);
      return () => { clearTimeout(t); setAutosaveStatus(prev => ({ ...prev, aws_special_award: { ...(prev.aws_special_award || { saving: false, lastSaved: null }), saving: false } })); };
    }
  }, [awsSpecialAward, isOpen, selectedJudge, currentStage, getAutoSaveKey]);

  const clearAutoSaveData = useCallback(() => {
    if (!selectedJudge || !currentStage) return;
    
    const feedbackKey = getAutoSaveKey('feedback');
    const strengthKey = getAutoSaveKey('strength');  
    const improvementKey = getAutoSaveKey('improvement');
    const innovationKey = getAutoSaveKey('innovation');
    const technicalKey = getAutoSaveKey('technical_complexity');
    const impactKey = getAutoSaveKey('impact');
    const presentationKey = getAutoSaveKey('presentation');
    const awsVoteKey = getAutoSaveKey('aws_funding_vote');
    const awsSpecialAwardKey = getAutoSaveKey('aws_special_award');

    if (feedbackKey) localStorage.removeItem(feedbackKey);
    if (strengthKey) localStorage.removeItem(strengthKey);
    if (improvementKey) localStorage.removeItem(improvementKey);
    if (innovationKey) localStorage.removeItem(innovationKey);
    if (technicalKey) localStorage.removeItem(technicalKey);
    if (impactKey) localStorage.removeItem(impactKey);
    if (presentationKey) localStorage.removeItem(presentationKey);
    if (awsVoteKey) localStorage.removeItem(awsVoteKey);
    if (awsSpecialAwardKey) localStorage.removeItem(awsSpecialAwardKey);
    setAutosaveStatus({});
  }, [selectedJudge, currentStage, getAutoSaveKey]);

  const AutoSaveIndicator = ({ field }: { field: string }) => {
    const status = autosaveStatus[field];
    if (!status) return null;
    if (status.saving) {
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500 ml-2" title="Saving...">
          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    if (status.lastSaved) {
      return (
        <div className="flex items-center gap-1 text-xs text-green-500 ml-2" title={`Auto-saved at ${status.lastSaved.toLocaleTimeString()}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      );
    }
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const stageClosed = isReadOnlyForStage(currentStage?.stage_name ?? null);
    const globalStatus = getScoringTimeStatus();
    const globalBlocked = !globalStatus.canScore;
    
    if (stageClosed || globalBlocked) {
      const message = stageClosed 
        ? 'Scoring period has ended for this stage. This view is read-only.'
        : 'Currently in view-only mode. Scoring is not available at this time.';
      toast({ 
        title: 'View-only mode', 
        description: message, 
        variant: 'destructive' 
      });
      return;
    }
    if (!selectedJudge || !currentStage) {
      toast({
        title: 'Error',
        description: 'Please select a judge and a judging stage before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const finalStrength = isFinalRound 
        ? (awsSpecialAward !== null ? `AWS_SPECIAL_AWARD:${awsSpecialAward}` : '')
        : strength;
      
      const scoreSubmitter = submitScore(
        team.id,
        selectedJudge.id,
        innovation,
        technicalComplexity,
        impact,
        presentation,
        feedback,
        finalStrength,
        improvement,
        awsFundingVote,
        hasBeenEvaluated,
        currentStage.stage_id
      );
      
      const result = await scoreSubmitter.submit();
      
      dispatch({
        type: 'ADD_SCORE',
        payload: {
          id: result.id || '0',
          team_id: team.id,
          judge_id: selectedJudge.id,
          innovation,
          technical_complexity: technicalComplexity,
          impact,
          presentation: presentation,
          feedback: feedback,
          strength: isFinalRound ? finalStrength : strength,
          improvement: improvement,
          aws_funding_vote: awsFundingVote,
          timestamp: new Date().toISOString(),
          stage_id: currentStage.stage_id,
        },
      });
      
      toast({
        title: '✅ Success!',
        description: 'Score submitted successfully! Thank you for your evaluation.',
        className: 'text-left',
      });
      
      clearAutoSaveData();
      
      if (!isScoringBlocked) {
        refreshData();
      }
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit score. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedJudge, currentStage, team.id, innovation, technicalComplexity, 
    impact, presentation, feedback, strength, improvement, awsFundingVote, 
    awsSpecialAward, hasBeenEvaluated, isFinalRound, toast, dispatch, refreshData, clearAutoSaveData
  ]);

  const handleScoreChange = useCallback((setter: React.Dispatch<React.SetStateAction<number>>, max: number = 10) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= max) {
      setter(value);
    } else if (e.target.value === '') {
      setter(1);
    }
  }, []);

  const handleScoreBlur = useCallback((setter: React.Dispatch<React.SetStateAction<number>>, max: number = 10) => (e: React.FocusEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value < 1) {
      setter(1);
    } else if (value > max) {
      setter(max);
    }
  }, []);

  const handleCardClick = useCallback(() => {
    if (selectedJudge && currentStage) {
      setIsOpen(true);
      if (!isScoringBlocked) {
        loadExistingScore();
      }
    }
  }, [selectedJudge, currentStage, isScoringBlocked, loadExistingScore]);

  const handleEvaluateClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
    loadExistingScore();
  }, [loadExistingScore]);

  const handleCloseDialog = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  }, []);

  return (
    <>
      <Card 
        className={`w-full transition-all duration-300 ease-out cursor-pointer hover:shadow-2xl hover:scale-[1.02] hover:bg-accent/40 border border-gray-200 hover:border-blue-300 group`}
        onClick={handleCardClick}
      >
        <div className="p-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-2xl transition-colors duration-300 group-hover:text-blue-700">{team.name}</CardTitle>
                <span className="bg-gray-100 group-hover:bg-blue-100 text-gray-800 group-hover:text-blue-800 text-xs font-medium px-2 py-1 rounded-full border border-gray-200 group-hover:border-blue-200 transition-all duration-300">
                  #{teamNumber}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full border transition-all duration-300 ${problemColor}`}>
                  {problemStatement}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasBeenEvaluated && (
                <div className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full border border-green-200">
                  Evaluated
                </div>
              )}
              
              <Button 
                className="whitespace-nowrap transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg hover:-translate-y-0.5 group-hover:bg-blue-600 group-hover:text-white" 
                size="sm"
                variant={hasBeenEvaluated ? "outline" : "default"}
                onClick={handleEvaluateClick}
                disabled={!selectedJudge || !currentStage}
              >
                {hasBeenEvaluated 
                  ? 'Edit Evaluation' 
                  : (isFinalRound && globalScoringStatus.canScore)
                    ? 'View Submission'
                    : 'View Submission'
                }
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {isOpen && (
        <div 
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-500 ease-out ${isClosing ? 'opacity-0 backdrop-blur-0' : 'opacity-100'}`}
          onClick={handleCloseDialog}
        >
          <Card 
            className={`w-full max-w-[650px] max-h-[80vh] overflow-y-auto shadow-2xl relative border-0 transition-all duration-500 ease-out ${isClosing ? 'scale-90 opacity-0 translate-y-8 rotate-1' : 'scale-100 opacity-100 translate-y-0 rotate-0'}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
          >
            <button 
              onClick={handleCloseDialog} 
              className="absolute top-3 right-3 h-10 w-10 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all duration-300 hover:scale-125 hover:rotate-90 z-10 bg-white/80 backdrop-blur-sm shadow-lg border border-gray-200 hover:border-red-300 hover:shadow-xl group"
              aria-label="Close dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <span>{team.name}</span>
                    <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2 py-1 rounded-full">
                      #{teamNumber}
                    </span>
                    {effectiveVideoUrl && effectiveVideoUrl.trim() !== '' && !isPlaceholderVideo(effectiveVideoUrl) ? (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full border border-green-200 flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Video Submitted
                      </span>
                    ) : (
                      <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full border border-orange-200 flex items-center gap-1">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        No Video
                      </span>
                    )}
                  </CardTitle>
                  <div>
                    <div className="mt-2 text-left">
                      <strong>Problem Statement:</strong> {problemStatement}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 text-left">
              <div className="space-y-6">
                {team.last_updated && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Team Submission Time:</span>
                      <span className="text-sm text-blue-800">
                        {new Date(team.last_updated).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })} at {new Date(team.last_updated).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="border-b pb-3">
                  <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileIcon className="h-5 w-5 text-blue-600" />
                    Submission Details
                  </h4>
                </div>

                {team.submission_project_description && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <FileIcon className="h-4 w-4 text-gray-600" />
                      <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Project Description</h5>
                    </div>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                      {team.submission_project_description}
                    </div>
                  </div>
                )}

                {effectiveVideoUrl && !isPlaceholderVideo(effectiveVideoUrl) ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <VideoIcon className="h-4 w-4 text-purple-600" />
                      <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                        Video Submission
                      </h5>
                    </div>
                    
                    <div className="rounded-lg overflow-hidden border border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
                      <div className="bg-gray-900 w-full" style={{ paddingTop: '56.25%', position: 'relative' }}>
                        <video
                          controls
                          preload="metadata"
                          className="absolute top-0 left-0 w-full h-full transition-opacity duration-300"
                          style={{ objectFit: 'contain', backgroundColor: 'transparent' }}
                          onLoadedMetadata={handleLoadedMetadata}
                          onError={handleVideoError}
                        >
                          <source src={effectiveVideoUrl || undefined} type="video/mp4" />
                          <source src={effectiveVideoUrl || undefined} type="video/quicktime" />
                          <source src={effectiveVideoUrl || undefined} type="video/x-msvideo" />
                          Your browser does not support the video tag.
                        </video>
                      </div>

                      <div className="p-3 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {getFileNameFromUrl(effectiveVideoUrl || '')}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {videoExt ? `${videoExt.toUpperCase()} Format` : 'Video File'}
                              {videoHasVisual === false ? ' • No visual track detected' : ''}
                              {videoLoadError ? ' • Error loading video' : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              asChild
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-105 hover:shadow-md"
                            >
                              <a 
                                href={effectiveVideoUrl || undefined} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                download
                              >
                                <VideoIcon className="h-3 w-3 mr-1" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </div>
                        
                        {(videoHasVisual === false || videoLoadError) && (
                          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            <div className="font-medium text-yellow-800">
                              {videoLoadError ? 'Video Preview Unavailable' : 'Limited Preview Available'}
                            </div>
                            <div className="text-yellow-700 mt-1">
                              {videoLoadError 
                                ? 'The video format may not be supported by your browser. Use the download link above to view the file.'
                                : 'This file may contain audio only or use codecs not fully supported by web browsers. Use the download link for best quality.'
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : effectiveVideoUrl && isPlaceholderVideo(effectiveVideoUrl) ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <VideoIcon className="h-4 w-4 text-gray-400" />
                      <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                        Video Submission
                      </h5>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white border border-gray-300 rounded-lg">
                      <VideoIcon className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">No video uploaded</p>
                        <p className="text-xs text-gray-500">Team submitted other materials without video</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {((team.github_url && team.github_url.trim() !== '-' && team.github_url.trim() !== '') || additionalMaterials.length > 0) && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      {!team.github_url || team.github_url.trim() === '-' || team.github_url.trim() === '' ? (
                        <Code className="h-4 w-4 text-gray-400" />
                      ) : team.github_url.includes('github.com') ? (
                        <Github className="h-4 w-4 text-gray-800" />
                      ) : (
                        <GitlabIcon className="h-4 w-4 text-orange-600" />
                      )}
                      <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Repository & Files</h5>
                    </div>
                    
                    <div className="space-y-3">
                      {team.github_url && team.github_url.trim() !== '-' && team.github_url.trim() !== '' && (
                        <a href={team.github_url} target="_blank" rel="noopener noreferrer" className="block">
                          <div className="flex items-center gap-3 p-3 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
                            <div className="flex-shrink-0">
                              {team.github_url.includes('github.com') ? (
                                <Github className="h-5 w-5 text-gray-800" />
                              ) : (
                                <GitlabIcon className="h-5 w-5 text-orange-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 text-sm">Source Repository</div>
                              <div className="text-xs text-gray-600 truncate">{getFileNameFromUrl(team.github_url) || team.github_url}</div>
                            </div>
                            <div className="flex-shrink-0">
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          </div>
                        </a>
                      )}

                      {additionalMaterials.length > 0 && (
                        <div className="space-y-2">
                          {team.github_url && team.github_url.trim() !== '-' && team.github_url.trim() !== '' && (
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-4 mb-2">Additional Files</div>
                          )}
                          {additionalMaterials.map((url, index) => (
                            <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="block">
                              <div className="flex items-center gap-3 p-3 bg-white border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-400 transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
                                <div className="flex-shrink-0">
                                  {getFileIcon(url)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 text-sm truncate">{getFileNameFromUrl(url)}</div>
                                  <div className="text-xs text-gray-600">Click to view or download</div>
                                </div>
                                <div className="flex-shrink-0">
                                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!team.submission_video_url && !team.github_url && !team.submission_project_description && additionalMaterials.length === 0 && (
                  <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 text-center">
                    <FileIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <div className="text-gray-500 font-medium">No submission details available</div>
                    <div className="text-gray-400 text-sm mt-1">This team hasn't provided any submission materials yet.</div>
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                <div className="border-b pb-3">
                  <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600" />
                    Evaluation Criteria
                  </h4>
                </div>

                <RubricPanel />

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-4 w-4 text-green-600" />
                    <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Scoring Categories</h5>
                  </div>

                  {/* Innovation */}
                  <div className="bg-white rounded-lg p-4 border border-gray-300 transition-all duration-300 hover:border-yellow-400 hover:shadow-lg hover:scale-[1.01] group">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-600 transition-transform duration-300 group-hover:scale-110" />
                        <span className="font-semibold text-gray-900 transition-colors duration-300 group-hover:text-yellow-700">Innovation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={innovation}
                          onChange={handleScoreChange(setInnovation, 10)}
                          onBlur={handleScoreBlur(setInnovation, 10)}
                          className="w-16 h-8 text-center border-gray-300 transition-all duration-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 focus:scale-105"
                        />
                        <span className="font-bold text-gray-700 transition-colors duration-300 group-hover:text-yellow-700">/10</span>
                        <AutoSaveIndicator field="innovation" />
                      </div>
                    </div>
                    <Slider
                      value={[innovation]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(value) => setInnovation(value[0])}
                      className="w-full transition-all duration-300 hover:scale-[1.01]"
                    />
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-300 transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:scale-[1.01] group">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600 transition-transform duration-300 group-hover:scale-110" />
                        <span className="font-semibold text-gray-900 transition-colors duration-300 group-hover:text-blue-700">Impact</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={impact}
                          onChange={handleScoreChange(setImpact, 10)}
                          onBlur={handleScoreBlur(setImpact, 10)}
                          className="w-16 h-8 text-center border-gray-300 transition-all duration-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:scale-105"
                        />
                        <span className="font-bold text-gray-700 transition-colors duration-300 group-hover:text-blue-700">/10</span>
                        <AutoSaveIndicator field="impact" />
                      </div>
                    </div>
                    <Slider
                      value={[impact]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(value) => setImpact(value[0])}
                      className="w-full transition-all duration-300 hover:scale-[1.01]"
                    />
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-300 transition-all duration-300 hover:border-purple-400 hover:shadow-lg hover:scale-[1.01] group">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-600 transition-transform duration-300 group-hover:scale-110" />
                        <span className="font-semibold text-gray-900 transition-colors duration-300 group-hover:text-purple-700">Feasibility</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={technicalComplexity}
                            onChange={handleScoreChange(setTechnicalComplexity, 10)}
                            onBlur={handleScoreBlur(setTechnicalComplexity, 10)}
                          className="w-16 h-8 text-center border-gray-300 transition-all duration-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:scale-105"
                        />
                        <span className="font-bold text-gray-700 transition-colors duration-300 group-hover:text-purple-700">/10</span>
                        <AutoSaveIndicator field="technical_complexity" />
                      </div>
                    </div>
                    <Slider
                      value={[technicalComplexity]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(value) => setTechnicalComplexity(value[0])}
                      className="w-full transition-all duration-300 hover:scale-[1.01]"
                    />
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-300 transition-all duration-300 hover:border-indigo-400 hover:shadow-lg hover:scale-[1.01] group">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-indigo-600 transition-transform duration-300 group-hover:scale-110" />
                        <span className="font-semibold text-gray-900 transition-colors duration-300 group-hover:text-indigo-700">Working Solution</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={presentation}
                          onChange={handleScoreChange(setPresentation, 10)}
                          onBlur={handleScoreBlur(setPresentation, 10)}
                          className="w-16 h-8 text-center border-gray-300 transition-all duration-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:scale-105"
                        />
                        <span className="font-bold text-gray-700 transition-colors duration-300 group-hover:text-indigo-700">/10</span>
                        <AutoSaveIndicator field="presentation" />
                      </div>
                    </div>
                    <Slider
                      value={[presentation]}
                      min={1}
                      max={10}
                      step={1}
                       onValueChange={(value) => setPresentation(value[0])}
                      className="w-full transition-all duration-300 hover:scale-[1.01]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-3">
                  <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Judge Feedback
                  </h4>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <label htmlFor="feedback" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                          General Feedback (Optional)
                        </label>
                      </div>
                      <AutoSaveIndicator field="feedback" />
                    </div>
                    <Textarea
                      id="feedback"
                      placeholder="Enter your feedback for the team..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={4}
                      className="bg-white border-gray-300 transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
                    />
                  </div>

                  {false && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <label htmlFor="strength" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                            Team Strengths (Optional)
                          </label>
                        </div>
                        <AutoSaveIndicator field="strength" />
                      </div>
                      <Textarea
                        id="strength"
                        placeholder="Enter the team's strengths..."
                        value={strength}
                         onChange={(e) => setStrength(e.target.value)}
                        rows={4}
                        className="bg-white border-gray-300 transition-all duration-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 resize-none"
                      />
                  </div>
                  )}

                  {false && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-600" />
                          <label htmlFor="improvement" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                            Suggestions for Improvement (Optional)
                          </label>
                        </div>
                        <AutoSaveIndicator field="improvement" />
                      </div>
                      <Textarea
                        id="improvement"
                        placeholder="Enter suggestions for improvement..."
                        value={improvement}
                         onChange={(e) => setImprovement(e.target.value)}
                        rows={4}
                        className="bg-white border-gray-300 transition-all duration-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none"
                      />
                  </div>
                  )}
              </div>

            </CardContent>
            <CardFooter className="border-t pt-4 mt-2">
              <div className="flex justify-between items-center w-full">
                <Button 
                  variant="outline" 
                  onClick={handleCloseDialog}
                  className="transition-all duration-300 ease-out hover:bg-gray-50 hover:border-gray-400 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                >
                  Cancel
                </Button>
                
                <div className="flex items-center gap-3">
                  {isScoringBlocked && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <Clock className="h-3 w-3" />
                      <span>
                        {scoringClosed 
                          ? 'Scoring ended'
                          : 'View only'
                        }
                      </span>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !selectedJudge || isScoringBlocked} 
                    className="px-8 transition-all duration-300 ease-out hover:bg-blue-700 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 active:translate-y-0 disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:bg-blue-600"
                  title={
                    isSubmitting ? 'Submitting score...' :
                    !selectedJudge ? 'Please select a judge first' :
                    isScoringBlocked ? 'Scoring is currently unavailable' :
                    'Submit your score'
                  }
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    'Submit Score'
                  )}
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
});