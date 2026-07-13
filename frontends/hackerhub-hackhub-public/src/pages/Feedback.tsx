import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentHackathon } from "@/contexts/CurrentHackathonContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Star, AlertCircle, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { buildUrl, authHeaders } from "@/lib/apiClient";

// A far-future sentinel used while the current hackathon (and thus its
// feedback release date) is still loading, so feedback stays gated.
const FAR_FUTURE = new Date(8640000000000000);

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


interface FeedbackItem {
  id: string;
  judge: string;
  role: string;
  date: string;
  scores: {
    innovation: number;
    execution: number;
    impact: number;
    presentation: number;
    technical: number;
  };
  comments: string;
  strengths: string[];
  improvements: string[];
}

const Feedback = () => {
  const { user, idToken } = useAuth();
  const { currentHackathon, currentHackathonId } = useCurrentHackathon();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<FeedbackItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);

  // Feedback release is sourced from the current hackathon's timeline. While
  // the hackathon is loading (or the date is unconfigured) we keep feedback
  // gated by treating the release date as far in the future.
  const feedbackReleaseDate = currentHackathon?.feedback_release
    ? new Date(currentHackathon.feedback_release)
    : FAR_FUTURE;

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    if (!user?.teamId || !idToken || !currentHackathonId) {
      console.log("Feedback: User has no teamId, idToken, or hackathon; skipping feedback fetch.");
      setLoading(false);
      setFeedbackAvailable(false);
      setFeedback(null);
      return;
    }

    try {
      const response = await axios.get(buildUrl(currentHackathonId, "feedback"), {
        headers: authHeaders(idToken)
      });

      if (response.data.feedback && response.data.feedback.length > 0) {
        setFeedback(response.data.feedback);
        setFeedbackAvailable(true);
      } else {
        setFeedback(null);
        setFeedbackAvailable(false);
      }
    } catch (error) {
      console.error("Failed to load feedback data:", error);
      toast({
        title: "Error",
        description: "Failed to load feedback data.",
        variant: "destructive",
      });
      setFeedback(null);
      setFeedbackAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [user?.teamId, idToken, currentHackathonId, toast]);

  useEffect(() => {
    if (user?.teamId && idToken && currentHackathonId) {
      loadFeedback();
    } else {
      setLoading(false);
      setFeedbackAvailable(false);
      setFeedback(null);
    }
  }, [user?.teamId, idToken, currentHackathonId, loadFeedback]);

  const releaseMs = feedbackReleaseDate.getTime();
  const [msRemaining, setMsRemaining] = useState<number>(() => Math.max(0, releaseMs - Date.now()));

  useEffect(() => {
    const tick = () => {
      setMsRemaining(Math.max(0, releaseMs - Date.now()));
    };

    // Re-sync immediately whenever the release date changes (e.g. after the
    // current hackathon record loads).
    tick();

    const remaining = releaseMs - Date.now();
    if (remaining <= 0) return;

    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [releaseMs]);

  useEffect(() => {
    if (msRemaining <= 0) {
      loadFeedback();
    }
  }, [msRemaining, loadFeedback]);

  const renderStars = (rating: number) => {
    const displayRating = rating / 2;
    const fullStars = Math.floor(displayRating);
    const hasHalfStar = displayRating % 1 >= 0.5;

    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`h-4 w-4 ${index < fullStars
                ? "text-yellow-500 fill-yellow-500"
                : index === fullStars && hasHalfStar
                  ? "text-yellow-500 fill-yellow-500/50"
                  : "text-gray-300"
              }`}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{displayRating.toFixed(1)}/5.0</span>
      </div>
    );
  };

  const renderContent = () => {
    if (!user?.teamId) {
      return (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center text-center">
              <Lock size={48} className="mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">Access Denied</h3>
              <p className="mb-4 max-w-md text-muted-foreground">
                Please register a team and select a problem statement to view feedback.
              </p>
              <Button asChild>
                <Link to="/dashboard">Register Team & Select Problem</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (loading) {
      return (
        <Card>
          <CardContent className="p-12 flex justify-center">
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <p className="text-muted-foreground">Loading feedback...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const now = new Date();

    if (!user?.hasSubmitted) {
      return (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center text-center">
              <Lock size={48} className="mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">No Project Submission Found</h3>
              <p className="mb-4 max-w-md text-muted-foreground">
                You need to submit a project before you can receive feedback from judges.
              </p>
              <Button asChild>
                <Link to="/submission">Submit Project</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

  if (now < feedbackReleaseDate) {
  const twoMinutesMs = 2 * 60 * 1000;
  const urgencyThresholdMs = 5 * 60 * 1000;
    const isUrgent = msRemaining <= urgencyThresholdMs;

    const formatTime = (ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
      return `${minutes}m ${seconds}s`;
    };

    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center text-center">
            <Lock size={48} className="mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">Feedback Not Yet Available</h3>
            <p className="mb-2 max-w-md text-muted-foreground">
              Feedback will be available on the announced date.
            </p>
            {currentHackathon?.feedback_release && (
              <p className="text-sm text-muted-foreground mb-4">
                Expected by: {formatWithGmt8(feedbackReleaseDate)}
              </p>
            )}

            <div className={`rounded-lg ${isUrgent ? 'px-8 py-6' : 'px-6 py-4'} border text-center w-full max-w-xl mx-auto ${isUrgent ? 'bg-red-50 border-red-300 text-red-700' : 'bg-muted/5 border-muted'}`}>
              <div className={`mx-auto font-mono ${isUrgent ? 'text-6xl md:text-7xl font-extrabold animate-pulse' : 'text-4xl md:text-5xl font-bold'}`} aria-live="polite">
                {formatTime(msRemaining)}
              </div>
              {isUrgent}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
    
    if (!feedbackAvailable || !feedback || feedback.length === 0) {
      return (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Feedback Available Yet</h3>
              <p className="mb-2 max-w-md text-muted-foreground">
                Judges are still reviewing your submission. Feedback will be posted here once available.
              </p>
        {currentHackathon?.feedback_release && (
          <p className="text-sm text-muted-foreground">
            Expected by: {formatWithGmt8(feedbackReleaseDate)}
          </p>
        )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-8">
        {feedback.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="text-primary" />
                <CardTitle>Feedback</CardTitle>
              </div>
              
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Comments</h4>
                <p className="text-muted-foreground">{item.comments}</p>
              </div>

              
              <div>
                <h4 className="font-medium mb-2">Strengths</h4>
                {item.strengths.some(strength => strength && !strength.startsWith('AWS_SPECIAL_AWARD:')) ? (
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {item.strengths
                      .filter(strength => strength && !strength.startsWith('AWS_SPECIAL_AWARD:'))
                      .map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground italic">-</p>
                )}
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Areas for Improvement</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {item.improvements.map((improvement, idx) => (
                    <li key={idx}>{improvement}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="aws-container py-8">
      <h1 className="text-3xl font-bold mb-8">Feedback</h1>
      {renderContent()}
    </div>
  );
};

export default Feedback;