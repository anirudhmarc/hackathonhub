import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, Clock, FileText, Upload, MessageSquare, Trophy, ArrowRight, CheckCircle, CircleDot, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import SEOHead from "@/components/SEOHead";
import BrandLockup from "@/components/BrandLockup";
import RubricPanel from "@/components/RubricPanel";
import axios from 'axios';
import { isLocked, getLockReason } from "@/utils/navigationUtils";
import { useCurrentHackathon } from "@/contexts/CurrentHackathonContext";
import { buildUrl, authHeaders } from "@/lib/apiClient";

// Every team is assigned this hidden "system" problem so the backend submission
// endpoint (which requires a non-null problem_id) accepts the free-text submission.
const SYSTEM_PROBLEM_ID = "prob-system";

// Sentinels used while the current hackathon (and thus its timeline) is still
// loading or has an unconfigured date. FAR_FUTURE keeps windows "not yet open";
// FAR_PAST is unused but kept symmetric for clarity.
const FAR_FUTURE = new Date(8640000000000000);

// Parse an ISO timeline field into a Date, falling back to FAR_FUTURE when the
// value is absent so gating stays closed until real data arrives.
const parseTimeline = (value: string | null | undefined): Date =>
  value ? new Date(value) : FAR_FUTURE;

const Dashboard = () => {
  const auth = useAuth();
  const { user, idToken, updateUserTeam, isLoading } = auth;
  const { currentHackathon, currentHackathonId } = useCurrentHackathon();
  const [pageInput, setPageInput] = useState({ "teamName": "" });
  const [registering, setRegistering] = useState(false);
  const { toast } = useToast();

  // Timeline dates sourced from the current hackathon record. When the record
  // (or a specific field) is missing we fall back to a far-future sentinel so
  // the corresponding window is treated as not-yet-open.
  const HACKATHON_START_DATE = parseTimeline(currentHackathon?.submission_start);
  const SUBMISSION_START_DATE = parseTimeline(currentHackathon?.submission_start);
  const SUBMISSION_END_DATE = parseTimeline(currentHackathon?.submission_end);
  const FINALISTS_ANNOUNCEMENT_DATE = parseTimeline(currentHackathon?.finalists_announcement);
  const WINNERS_ANNOUNCEMENT_DATE = parseTimeline(currentHackathon?.winners_announcement);
  const FEEDBACK_RELEASE_DATE = parseTimeline(currentHackathon?.feedback_release);

  const [hackathonStarted, setHackathonStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [submissionTimeLeft, setSubmissionTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const now = new Date();
  const submissionOpen = now.getTime() >= SUBMISSION_START_DATE.getTime() && now.getTime() <= SUBMISSION_END_DATE.getTime();
  const hasSubmitted = user?.hasSubmitted || false;
  const hackathonStartDateMs = HACKATHON_START_DATE.getTime();
  const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Kuala_Lumpur'
});

const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'Asia/Kuala_Lumpur'
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Kuala_Lumpur'
});

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

  
  const CountdownTimer = ({ timeLeft, label }: { timeLeft: { days: number; hours: number; minutes: number; seconds: number }, label: string }) => {
    if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
      return null;
    }

    const formatProblemTimeLeft = () => {
      const { days, hours, minutes, seconds } = timeLeft;
      const parts = [];
      if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
      if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
      if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
      if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
      return parts.join(', ');
    };

    return (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700">{label}:</span>
          <span className="text-sm font-bold text-blue-700">{formatProblemTimeLeft()}</span>
        </div>
      </div>
    );
  };

  const calculateTimeAndStatus = () => {
    const now = new Date().getTime();
    const difference = hackathonStartDateMs - now;
    if (difference <= 0) {
      setHackathonStarted(true);
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    } else {
      setHackathonStarted(false);
    }
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
  };

  useEffect(() => {
    const updateCountdownAndStatus = () => {
      setTimeLeft(calculateTimeAndStatus());
    };
    updateCountdownAndStatus();
    const timer = setInterval(updateCountdownAndStatus, 1000);
    return () => clearInterval(timer);
  }, [hackathonStartDateMs]);

  
  useEffect(() => {
    const updateProblemCountdowns = () => {
      const now = new Date().getTime();

      const submissionDiff = SUBMISSION_END_DATE.getTime() - now;
      if (submissionDiff > 0) {
        const days = Math.floor(submissionDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((submissionDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((submissionDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((submissionDiff % (1000 * 60)) / 1000);
        setSubmissionTimeLeft({ days, hours, minutes, seconds });
      } else {
        setSubmissionTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateProblemCountdowns();
    const timer = setInterval(updateProblemCountdowns, 1000);
    return () => clearInterval(timer);
  }, [SUBMISSION_END_DATE.getTime()]);

  useEffect(() => {
    if (user?.teamName && registering) {
      setRegistering(false);
    }
  }, [user?.teamName, registering]);

  const rules = [
    "Teams must consist of 1-5 members. All cash prizes for winning teams will be disbursed to a single designated team representative.",
    "Your project must be a Voice AI use case. Work backwards from a real customer pain point and build a solution that addresses it.",
    "All submissions must incorporate AWS AI services and be deployed on AWS Cloud.",
    "You are encouraged to build a strong voice AI stack.",
    "All submissions must be original work.",
    "Push your code to internal Amazon GitLab (gitlab.aws.dev) and share the repository link in your submission.",
    "The judging panel's decisions are final and binding."
  ];

  const workshops: any[] = [];

  const steps = [
    {
      id: 1,
      name: "Register Team",
      description: "Register your team to participate in the hackathon",
      icon: UserPlus,
      completed: !!user?.teamName,
      action: () => setRegistering(true),
      actionLabel: "Register Team",
      link: null
    },
    {
      id: 2,
      name: "Hackathon Starts",
      description: hackathonStarted
        ? "Hackathon has started! You can now work on your project."
        : `Hackathon starts on ${longDateFormatter.format(HACKATHON_START_DATE)}`,
      icon: Clock,
      completed: hackathonStarted,
      action: null,
      actionLabel: null,
      link: null,
      showTimer: !hackathonStarted
    },
    {
      id: 3,
      name: "Submit Project",
      description: "Submit your project: a Voice AI solution to a real customer pain point, with a video demo and your GitLab repository.",
      icon: Upload,
      completed: hasSubmitted,
      actionLabel: submissionOpen && user?.teamName ? "Submit Project" : null,
      link: submissionOpen && user?.teamName ? "/submission" : null,
      disabled: !submissionOpen || !user?.teamName,
      locked: isLocked("/submission", user, currentHackathon),
      lockReason: getLockReason("/submission", user, currentHackathon)
    },
    {
      id: 4,
      name: "Finalist Announcement",
      description: `Judges are reviewing submissions. Finalists will be announced on ${longDateFormatter.format(FINALISTS_ANNOUNCEMENT_DATE)}.`,
      icon: MessageSquare,
  completed: (new Date().getTime() >= FEEDBACK_RELEASE_DATE.getTime()),
      action: null,
      actionLabel: "Check Feedback",
      link: hasSubmitted ? "/feedback" : null,
      disabled: !hasSubmitted,
      locked: isLocked("/feedback", user, currentHackathon),
      lockReason: getLockReason("/feedback", user, currentHackathon)
    },
    {
      id: 5,
      name: "Winners Announced",
      description: `Finalist presentations and winners will be announced on ${longDateFormatter.format(WINNERS_ANNOUNCEMENT_DATE)}`,
      icon: Trophy,
      completed: (new Date().getTime() >= WINNERS_ANNOUNCEMENT_DATE.getTime()),
      action: null,
      actionLabel: null,
      link: null
    }
  ];

  const currentStepIndex = steps.findIndex(step => !step.completed);
  const currentStep = currentStepIndex !== -1 ? currentStepIndex : steps.length - 1;
  const progressPercentage = ((steps.filter(step => step.completed).length) / steps.length) * 100;

  const formatTimeLeft = () => {
    if (hackathonStarted) return "Hackathon has started!";
    const { days, hours, minutes, seconds } = timeLeft;
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    return parts.join(', ');
  };

  const isEventStarted = (startTime: Date) => {
    const now = new Date();
    return now.getTime() >= startTime.getTime();
  };

  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageInput.teamName.trim()) {
      toast({ title: "Error", description: "Please enter a team name", variant: "destructive" });
      return;
    }

    if (!idToken) {
        toast({ title: "Authentication Error", description: "User is not authenticated. Please log in again.", variant: "destructive" });
        return;
    }

    if (!currentHackathonId) {
        toast({ title: "No Hackathon Selected", description: "Please select a hackathon before registering a team.", variant: "destructive" });
        return;
    }

    setRegistering(true);
    try {
        const response = await axios.post(
            buildUrl(currentHackathonId, "teams"),
            { teamName: pageInput.teamName },
            { headers: { 'Content-Type': 'application/json', ...authHeaders(idToken) } }
        );
        console.log("Team registration API response:", response.data);

        const registeredTeamName = response.data.teamName;
        const registeredTeamId = response.data.teamId;

  // Assign the hidden system problem so the team has a valid problem_id for submission.
  // The actual problem statement is captured as free text on the submission form.
  try {
    await axios.post(
      buildUrl(currentHackathonId, "problems"),
      { problemId: SYSTEM_PROBLEM_ID },
      { headers: { 'Content-Type': 'application/json', ...authHeaders(idToken) } }
    );
  } catch (assignErr) {
    console.error("Failed to assign system problem to team:", assignErr);
  }

  updateUserTeam(registeredTeamName, registeredTeamId, SYSTEM_PROBLEM_ID, null, null, false);
  toast({ title: "Team Registered", description: `Your team "${registeredTeamName}" has been successfully registered.` });
  setPageInput({ "teamName": "" });
    } catch (error) {
        console.error("Error registering team:", error);
        let errorMessage = "Failed to register team. An unknown error occurred.";
        if (axios.isAxiosError(error) && error.response) {
            if (error.response.status === 409) {
                errorMessage = error.response.data.message || "You have already registered a team.";
                toast({ title: "Team Already Registered", description: errorMessage, variant: "default" });
            } else {
                errorMessage = error.response.data.message || error.response.statusText || `Status: ${error.response.status}`;
            }
        } else {
            errorMessage = error.message;
        }
        toast({ title: "Registration Error", description: errorMessage, variant: "destructive" });
    } finally {
        setRegistering(false);
    }
  };

    

  return (
    <>
      <SEOHead
        title="Dashboard | AWS Hackathon"
        description="Your team dashboard for the AWS Voice AI Hackathon. Register your team, submit your project, and track your progress."
        keywords="Voice AI Hackathon, AWS, Team Portal, Hackathon Dashboard"
        canonical="/dashboard"
      />
      <div className="aws-container py-8">
      <div className="mb-8 flex flex-col items-center text-center gap-4 py-6 rounded-xl border bg-white/60">
        <BrandLockup size="lg" />
        <div>
          <h1 className="text-3xl font-bold">AWS Hackathon</h1>
          <p className="text-muted-foreground mt-1">Build the future of Voice AI — work backwards from a real customer pain point.</p>
        </div>
      </div>
      
      
      {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Loading dashboard data...</p>
            </div>
        ) : (
            <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Hackathon Progress</CardTitle>
              <CardDescription>
                Track your journey through the AWS Hackathon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{Math.round(progressPercentage)}% Complete</span>
                  <span>{steps.filter(step => step.completed).length} of {steps.length} Steps</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              <div className="space-y-6 mt-6">
                {steps.map((step, index) => {
                  const showStep = index <= currentStep + 1 || step.completed;
                  if (!showStep) return null;
                  return (
                    <div key={step.id} className={`flex items-start gap-4 ${step.completed ? '' : 'opacity-80'}`}>
                      <div className={`rounded-full p-2 flex-shrink-0 ${step.completed
                        ? 'bg-green-100'
                        : index === currentStep
                          ? 'bg-blue-100'
                          : step.waiting
                            ? 'bg-yellow-100'
                            : 'bg-muted'
                        }`}>
                        {step.completed ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : step.waiting ? (
                          <CircleDot className="h-6 w-6 text-yellow-600" />
                        ) : step.locked ? (
                          <Lock className="h-6 w-6 text-muted-foreground" />
                        ) :
                          (
                            <step.icon className={`h-6 w-6 ${index === currentStep ? 'text-blue-600' : 'text-muted-foreground'}`} />
                          )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between flex-wrap gap-2">
                          <h3 className={`font-medium ${step.completed
                            ? 'text-green-700'
                            : step.waiting
                              ? 'text-yellow-700'
                              : index === currentStep
                                ? 'text-blue-700'
                                : ''
                            }`}>
                            {step.name}
                            {index === currentStep && !step.completed && <span className="ml-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">Current Step</span>}
                            {step.waiting && !step.completed && <span className="ml-2 inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">Waiting</span>}
                            {step.completed && <span className="ml-2 inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Completed</span>}
                          </h3>
                          <span className="text-sm text-muted-foreground">Step {index + 1} of {steps.length}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>

                        {step.showTimer && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-700">Time remaining:</span>
                              <span className="text-sm font-bold text-blue-700">{formatTimeLeft()}</span>
                            </div>
                          </div>
                        )}
                        
                        {step.name === "Submit Project" && submissionOpen && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded-md">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-green-700">Status:</span>
                                <span className="text-sm font-bold text-green-700">Submission is open!</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-green-700">Deadline:</span>
                                <span className="text-sm font-bold text-green-700">{dateTimeFormatter.format(SUBMISSION_END_DATE)}</span>
                              </div>
                              {(submissionTimeLeft.days > 0 || submissionTimeLeft.hours > 0 || submissionTimeLeft.minutes > 0 || submissionTimeLeft.seconds > 0) && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-green-700">Time remaining:</span>
                                  <span className="text-sm font-bold text-green-700">
                                    {(() => {
                                      const { days, hours, minutes, seconds } = submissionTimeLeft;
                                      const parts = [];
                                      if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
                                      if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
                                      if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
                                      if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
                                      return parts.length > 0 ? parts.join(', ') : 'Less than a minute';
                                    })()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {step.waiting && (
                          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-yellow-700">Status:</span>
                              <span className="text-sm font-bold text-yellow-700">Waiting for announcement</span>
                            </div>
                          </div>
                        )}

                        {step.locked && !step.completed && (
                          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Status:</span>
                              <span className="text-sm font-bold text-gray-700">Not yet available</span>
                            </div>
                            {step.lockReason && (
                              <div className="mt-1">
                                <span className="text-sm text-gray-600">{step.lockReason}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {index === currentStep && (step.action || step.link) && (
                          <div className="mt-3">
                            {step.action ? (
                              <Button onClick={step.action} size="sm" className="flex items-center gap-2" disabled={step.disabled}>
                                {step.locked && <Lock className="h-4 w-4" />}
                                {step.actionLabel}
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            ) : step.link ? (
                              <Button asChild size="sm" className="flex items-center gap-2">
                                <Link to={step.link}>
                                  {step.locked && <Lock className="h-4 w-4" />}
                                  {step.actionLabel}
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
            
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Team Information</CardTitle>
                <CardDescription>
                  {user?.teamName
                    ? "Your team registration is complete."
                    : "Register your team for the AWS Hackathon."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user?.teamName ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-green-700 font-medium">Team Successfully Registered</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <p className="font-medium">Team Name:</p>
                                <p>{user?.teamName}</p>
                            </div>
                            <div className="flex justify-between">
                                <p className="font-medium">Team ID:</p>
                                <p>{user?.teamId}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    registering ? (
                        <form onSubmit={handleRegisterTeam} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="teamName">Team Name</Label>
                                <Input
                                    id="teamName"
                                    value={pageInput.teamName}
                                    onChange={(e) => setPageInput(prev => ({ ...prev, "teamName": e.target.value }))}
                                    placeholder="Enter your team name"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setRegistering(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Register Team</Button>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center py-8">
                            <p className="mb-4 text-muted-foreground">
                                You haven't registered a team yet. Register now to participate in the hackathon.
                            </p>
                            <Button onClick={() => setRegistering(true)}>Register Team Now</Button>
                        </div>
                    )
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>Access key hackathon resources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/problems">
                    <div className="flex items-center">
                      <span>View Agenda</span>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/submission">
                    <div className="flex items-center">
                      {isLocked("/submission", user, currentHackathon) && <Lock size={14} className="mr-2" />}
                      <span>View Project Submission</span>
                    </div>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link to="/feedback">
                    <div className="flex items-center">
                      {isLocked("/feedback", user, currentHackathon) && <Lock size={14} className="mr-2" />}
                      <span>View Judge Feedback</span>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <a href="https://docs.google.com/document/d/1qLzB_M9fDqHuipmm9LpU3c9PeB6p4HPTJOArKq89-Rg/edit" target="_blank" rel="noopener noreferrer">
                    <div className="flex items-center">
                      <span>Prerequisites</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </a>
                </Button>
              </CardContent>
            </Card>
            <Card className="col-span-1 md:col-span-3">
              <CardHeader>
                <CardTitle>Hackathon Timeline</CardTitle>
                <CardDescription>Key dates for the AWS Hackathon (shown in your local time)</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="relative">
                  <div className="absolute left-2 sm:left-3 md:left-5 top-0 bottom-0 w-0.5 bg-aws-gray"></div>
                  <div className="space-y-6 sm:space-y-8">
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">1</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Registration Open</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">June 1 - June 15, 2026</p>
                        <p className="text-sm sm:text-base">Register your team to participate in the hackathon.</p>
                      </div>
                    </div>
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">2</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Hackathon Starts</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">{longDateFormatter.format(HACKATHON_START_DATE)}</p>
                        <p className="text-sm sm:text-base">Kickoff, then start building. The official start of the hackathon!</p>
                      </div>
                    </div>
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">3</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Submission Period</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">{shortDateFormatter.format(SUBMISSION_START_DATE)} - {longDateFormatter.format(SUBMISSION_END_DATE)}</p>
                        <p className="text-sm sm:text-base">Submit your Voice AI project: video demo, GitLab repository, and optional demo app URL.</p>
                      </div>
                    </div>
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">4</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Judging</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">June 12 - June 14, 2026</p>
                        <p className="text-sm sm:text-base">Judges review submissions and score each team.</p>
                      </div>
                    </div>
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">5</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Finalists &amp; Winners Announced</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">{longDateFormatter.format(WINNERS_ANNOUNCEMENT_DATE)}</p>
                        <p className="text-sm sm:text-base">Finalists are announced and winners are celebrated.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="py-2 col-span-3">
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Official Rules & Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rules.map((rule, index) => (
                      <div key={index} className="flex gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <p>{rule}</p>
                      </div>
                    ))}
                  </div>
                    <div className="mt-6 p-4 bg-muted/50 rounded-md">
                      <p className="italic text-muted-foreground">
                        Note: The organizers reserve the right to modify these rules at their discretion.
                        Participants will be notified of any changes through official communication channels (Slack).
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            <RubricPanel className="col-span-1 md:col-span-3" />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Dashboard;