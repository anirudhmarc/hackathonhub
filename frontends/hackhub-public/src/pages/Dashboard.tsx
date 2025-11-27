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
import axios from 'axios';
import { isLocked, getLockReason } from "@/utils/navigationUtils";

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;
const HACKATHON_START_DATE = new Date(import.meta.env.VITE_HACKATHON_START_DATE);
const PROBLEMS_START_DATE = new Date(import.meta.env.VITE_PROBLEMS_START_DATE);
const PROBLEMS_SELECTION_DATE = new Date(import.meta.env.VITE_PROBLEMS_SELECTION_DATE);
const SUBMISSION_START_DATE = new Date(import.meta.env.VITE_SUBMISSION_START_DATE);
const SUBMISSION_END_DATE = new Date(import.meta.env.VITE_SUBMISSION_END_DATE);
const FINALISTS_ANNOUNCEMENT_DATE = new Date(import.meta.env.VITE_FINALISTS_ANNOUNCEMENT_DATE);
const WINNERS_ANNOUNCEMENT_DATE = new Date(import.meta.env.VITE_WINNERS_ANNOUNCEMENT_DATE);
const FEEDBACK_RELEASE_DATE = new Date(import.meta.env.VITE_FEEDBACK_RELEASE_DATE);

const Dashboard = () => {
  const auth = useAuth();
  const { user, idToken, updateUserTeam, isLoading } = auth;
  const [pageInput, setPageInput] = useState({ "teamName": "" });
  const [registering, setRegistering] = useState(false);
  const { toast } = useToast();

  const [hackathonStarted, setHackathonStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showPreBriefingAlert, setshowPreBriefingAlert] = useState(true);
  const preBriefingEndDate  = new Date('2025-08-25T12:30:00+08:00')
  const [showAWSSalesWorkshopAlert, setShowAWSSalesWorkshopAlert] = useState(true);
  const awsSalesWorkshopEndDate = new Date('2025-09-17T17:30:00+08:00');
  const [showPitchingWorkshopAlert, setShowPitchingWorkshopAlert] = useState(true);
  const pitchingWorkshopEndDate = new Date('2025-09-18T12:00:00+08:00');
  const [showAIUnlockedWorkshopAlert, setShowAIUnlockedWorkshopAlert] = useState(true);
  const aiUnlockedWorkshopEndDate = new Date('2025-09-18T15:00:00+08:00');
  const [showCVWorkshopAlert, setShowCVWorkshopAlert] = useState(true);
  const cvWorkshopEndDate = new Date('2025-09-18T17:00:00+08:00');
  const [showGitlabWorkshopAlert, setShowGitlabWorkshopAlert] = useState(true);
  const gitlabWorkshopEndDate = new Date('2025-09-19T11:00:00+08:00');
  const [showQBusinessWorkshopAlert, setShowQBusinessWorkshopAlert] = useState(true);
  const qBusinessWorkshopEndDate = new Date('2025-09-25T12:00:00+08:00');
  const [showOnsiteHackathonAlert, setShowOnsiteHackathonAlert] = useState(true);
  const onsiteHackathonEndDate = new Date('2025-09-21T17:00:00+08:00');

  
  const [problemStatementTimeLeft, setProblemStatementTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [problemSelectionTimeLeft, setProblemSelectionTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  
  const [submissionTimeLeft, setSubmissionTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const problemsAnnounced = new Date().getTime() >= PROBLEMS_START_DATE.getTime();
  const problemsSelectionOpen = new Date().getTime() >= PROBLEMS_SELECTION_DATE.getTime() && new Date().getTime() < new Date(import.meta.env.VITE_PROBLEMS_SELECTION_END_DATE).getTime();
  const hasSelectedProblem = !!user?.problemId;
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
      
      
      const problemStatementDiff = PROBLEMS_START_DATE.getTime() - now;
      if (problemStatementDiff > 0) {
        const days = Math.floor(problemStatementDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((problemStatementDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((problemStatementDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((problemStatementDiff % (1000 * 60)) / 1000);
        setProblemStatementTimeLeft({ days, hours, minutes, seconds });
      } else {
        setProblemStatementTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }

      
      const problemSelectionDiff = PROBLEMS_SELECTION_DATE.getTime() - now;
      if (problemSelectionDiff > 0) {
        const days = Math.floor(problemSelectionDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((problemSelectionDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((problemSelectionDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((problemSelectionDiff % (1000 * 60)) / 1000);
        setProblemSelectionTimeLeft({ days, hours, minutes, seconds });
      } else {
        setProblemSelectionTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }

      
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
  }, []);

useEffect(() => {
  const nowInMalaysia = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' });
  const currentDate = new Date(nowInMalaysia);

  
  if (currentDate.getTime() > awsSalesWorkshopEndDate.getTime()) {
    setShowAWSSalesWorkshopAlert(false);
  }
  if (currentDate.getTime() > pitchingWorkshopEndDate.getTime()) {
    setShowPitchingWorkshopAlert(false);
  }
  if (currentDate.getTime() > aiUnlockedWorkshopEndDate.getTime()) {
    setShowAIUnlockedWorkshopAlert(false);
  }
  if (currentDate.getTime() > cvWorkshopEndDate.getTime()) {
    setShowCVWorkshopAlert(false);
  }
  if (currentDate.getTime() > gitlabWorkshopEndDate.getTime()) {
    setShowGitlabWorkshopAlert(false);
  }
  if (currentDate.getTime() > qBusinessWorkshopEndDate.getTime()) {
    setShowQBusinessWorkshopAlert(false);
  }
  if (currentDate.getTime() > onsiteHackathonEndDate.getTime()) {
    setShowOnsiteHackathonAlert(false);
  }

  
  if (currentDate.getTime() > preBriefingEndDate.getTime()) {
    setshowPreBriefingAlert(false);
  }
  
}, []);

  useEffect(() => {
    if (user?.teamName && registering) {
      setRegistering(false);
    }
  }, [user?.teamName, registering]);

  const rules = [
    "Participants must form teams consisting of 1-5 members. All cash prizes for winning teams will be disbursed to a single designated team representative.",
    "All submissions must incorporate AWS AI services and be deployed on AWS Cloud.",
    "For the student track, the submission must have problem statement provided by the organizers and enrolled in the HackHub portal.",
    "For the corporate track, participants will not be provided with problem statement, and they are encouraged to bring their own problem statements or ideas to work on during the hackathon.",
    "All submissions must be original work.",
    "Participants must prioritize Malaysia region (ap-southeast-5) for their deployments. Alternative regions may only be utilized if required services are unavailable in Malaysia region.",
    "AWS credits will be provided to participants for this hackathon.",
    "While AWS employees are welcome to participate, they are ineligible for prizes.",
    "The judging panel's decisions are final and binding."
  ];

  const workshops = [
      {
        id: 'onsite-hackathon',
        show: showOnsiteHackathonAlert,
        title: "Onsite Hackathon - Great Malaysia AI Hackathon  2025",
        description: "Join us for the main hackathon event! Experience collaborative innovation, networking opportunities, and hands-on development at Asia Pacific University. This is where ideas come to life and teams create amazing AI solutions using AWS services. Don't forget to bring your own power plug extension!",
        date: "20-21 September 2025",
        time: "8:00 AM GMT+8 - 5:00 PM GMT+8",
        startTime: new Date('2025-09-20T08:00:00+08:00'),
        location: "Asia Pacific University (APU), Kuala Lumpur",
        rsvpLink: "https://maps.app.goo.gl/pYPqpfK9GsN3ebuV8",
        color: "red",
  iconPath: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      },
      {
        id: 'customer-centric',
        show: showAWSSalesWorkshopAlert,
        title: "A Customer-Centric Methodology to Drive Innovation",
        description: "Navin brings over 25 years of experience across enterprise innovation, startups, and digital transformation. Having led AWS ASEAN Advisory and founded a tech consultancy, he now runs the Khazanah-Korn Ferry MGIP programme to accelerate Malaysian SMEs into global champions.",
        date: "17 September 2025",
        time: "9:30 AM GMT+8 - 5:30 PM GMT+8",
        startTime: new Date('2025-09-17T09:30:00+08:00'),
        location: "S-08-03, APU / Virtual Session",
        rsvpLink: "https://forms.office.com/r/qLHaYKMNTW",
        color: "indigo",
  iconPath: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2a2 2 0 0 0-2 2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
      },
      {
        id: 'pitching',
        show: showPitchingWorkshopAlert,
        title: "Speak Your Brand. Craft Stories. Deliver Pitches. Win Hearts",
        description: "In a noisy, competitive market, a clear brand story is essential. This workshop helps you position customers as the hero and your brand as their guide, with hands-on coaching by Lim Hui Ping to craft stories that build trust and spark word-of-mouth.",
        date: "18 September 2025",
        time: "9:30 AM GMT+8 - 12:00 PM GMT+8",
        startTime: new Date('2025-09-18T09:30:00+08:00'),
        location: "S-08-03, APU / Virtual Session",
        rsvpLink: "https://forms.office.com/r/4P7ZKeapn3",
        color: "purple",
  iconPath: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v3a7 7 0 0 1-14 0v-3"
      },
      {
        id: 'ai-unlocked',
        show: showAIUnlockedWorkshopAlert,
        title: "AI Unlocked: From Startup Buzz to Real-World Impact",
        description: "AI is everywhere—but how do you turn hype into opportunity? This session by GenAI Fund explores top AI trends, real-world use cases, and startup insights to help you turn ideas into action at the hackathon and beyond.",
        date: "18 September 2025",
        time: "1:30 PM GMT+8 - 3:00 PM GMT+8",
        startTime: new Date('2025-09-18T13:30:00+08:00'),
        location: "S-08-03, APU / Virtual Session",
        rsvpLink: "https://forms.office.com/r/Qnk0ztJ4uW",
        color: "yellow",
  iconPath: "M13 2H6L3.5 9H9.8L8 22L16 14H10.5L13 2Z"
      },
      {
        id: 'cv-workshop',
        show: showCVWorkshopAlert,
        title: "Hack Your CV Like an AI Pro",
        description: "Learn how to turn your projects and skills into an impact that gets you noticed. A fast-paced, 60-minute interactive session for aspiring entrepreneurs and students.",
        date: "18 September 2025",
        time: "3:00 PM GMT+8 - 5:00 PM GMT+8",
        startTime: new Date('2025-09-18T15:00:00+08:00'),
        speaker: "Jacinta Thein, CEO @ JTandCom",
        location: "S-08-03, APU / Virtual Session",
        rsvpLink: "https://forms.office.com/r/YKHqt6sp0s",
        color: "green",
  iconPath: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"
      },
      {
        id: 'gitlab',
        show: showGitlabWorkshopAlert,
        title: "Accelerating Software Development Securely with GitLab Duo",
        description: "Explore GitLab's CI/CD platform and see how GitLab Duo's AI features—from code generation to security fixes—can transform workflows. Discover how organizations accelerate development while maintaining quality.",
        date: "19 September 2025",
        time: "9:30 AM GMT+8 - 11:00 AM GMT+8",
        startTime: new Date('2025-09-19T09:30:00+08:00'),
        speaker: "Valerie Lee, Ecosystem Solutions Architect @ GitLab",
        location: "Virtual Session",
        rsvpLink: "https://page.gitlab.com/software-dev-gitlab-duo-preworkshop.html",
        color: "blue",
  iconPath: "M16 18s-2 1-3 1-3-1-4-1-2 1-3 1-2-1-3-1-3 1-4 1V5s2-1 3-1 3 1 4 1 2-1 3-1 2 1 3 1 2-1 3-1 2 1 3 1v11z"
      },
      {
        id: 'q-business',
        show: showQBusinessWorkshopAlert,
        title: "Generative AI-powered Assistant Using Amazon Q Business",
        description: "This workshop will guide participants through creating AI-powered assistants using Amazon Q Business. Learn how to build intelligent assistants that can help streamline business processes and enhance productivity.",
        date: "25 September 2025",
        time: "9:30 AM GMT+8 - 12:00 PM GMT+8",
        startTime: new Date('2025-09-25T09:30:00+08:00'),
        location: "Virtual Session",
        rsvpLink: "https://forms.office.com/r/UXBWk5w9zM",
        color: "orange",
  iconPath: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      },
  ];

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
    ...(user?.track !== 'corporate' ? [{
      id: 2,
      name: "Select Problem Statement",
      description: hasSelectedProblem
        ? "Your team has successfully selected a problem statement."
        : (problemsSelectionOpen
          ? "Problem selection is now open. Choose one for your team."
          : problemsAnnounced
            ? `Problems are announced! Selection opens ${dateTimeFormatter.format(PROBLEMS_SELECTION_DATE)}`
            : `Problem statements will be announced ${dateTimeFormatter.format(PROBLEMS_START_DATE)}`),
      icon: FileText,
      completed: hasSelectedProblem,
      action: null,
      actionLabel: hasSelectedProblem 
        ? "View Problem" 
        : (problemsAnnounced 
          ? (problemsSelectionOpen ? "Select Problem" : "View Problems") 
          : null),
      link: hasSelectedProblem ? "/problems" : (problemsAnnounced && user?.teamName ? "/problems" : null),
      disabled: !problemsAnnounced || !user?.teamName,
      waiting: !hasSelectedProblem && problemsAnnounced,
      locked: isLocked("/problems", user),
      lockReason: getLockReason("/problems", user)
    }] : []),
    {
      id: 3,
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
      id: (user?.track === 'corporate' ? 3 : 4),
      name: "Submit Project",
      description: "Submit your video demonstration and additional materials",
      icon: Upload,
      completed: hasSubmitted,
      actionLabel: submissionOpen && user?.teamName ? "Submit Project" : null,
      link: submissionOpen && user?.teamName ? "/submission" : null,
      disabled: !submissionOpen || !user?.teamName || (user?.track !== 'corporate' && !hasSelectedProblem),
      locked: isLocked("/submission", user),
      lockReason: getLockReason("/submission", user)
    },
    {
      id: (user?.track === 'corporate' ? 4 : 5),
      name: "Finalist Announcement",
      description: `Judges are reviewing submissions. Finalists will be announced on ${longDateFormatter.format(FINALISTS_ANNOUNCEMENT_DATE)}.`,
      icon: MessageSquare,
  completed: (new Date().getTime() >= FEEDBACK_RELEASE_DATE.getTime()),
      action: null,
      actionLabel: "Check Feedback",
      link: hasSubmitted ? "/feedback" : null,
      disabled: !hasSubmitted,
      locked: isLocked("/feedback", user),
      lockReason: getLockReason("/feedback", user)
    },
    {
      id: (user?.track === 'corporate' ? 5 : 6),
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

    setRegistering(true);
    try {
        const response = await axios.post(
            `${API_GATEWAY_BASE_URL}/participant/teams`,
            { teamName: pageInput.teamName },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` } }
        );
        console.log("Team registration API response:", response.data);

        const registeredTeamName = response.data.teamName;
        const registeredTeamId = response.data.teamId;

  const trackType: 'student' | 'corporate' | null = 'student';

  updateUserTeam(registeredTeamName, registeredTeamId, null, trackType, null, false);
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
        title="Dashboard - Great AI Hackathon Malaysia 2025 | HackHub AWS Platform"
        description="Access your team dashboard for the Great AI Hackathon Malaysia 2025. Register your team, select problem statements, submit projects, and track your progress in Malaysia's premier AI innovation challenge on AWS HackHub."
        keywords="AI Hackathon Dashboard, Great AI Hackathon Malaysia, HackHub Dashboard, AWS AI Challenge Dashboard, Malaysia AI Competition Dashboard, Team Registration Dashboard, Hackathon Progress Tracker"
        canonical="/dashboard"
      />
      <div className="aws-container py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      
      <div className="mb-8">
        {workshops.filter(w => w.show).length > 0 && (
          <div className="space-y-6">
      {workshops.filter(w => w.show).map((workshop) => (
        <div key={workshop.id} className={`relative p-6 rounded-lg border-2 ${
          workshop.color === 'blue' ? 'border-blue-500 bg-blue-50 text-blue-900' :
          workshop.color === 'green' ? 'border-green-500 bg-green-50 text-green-900' :
          workshop.color === 'orange' ? 'border-orange-500 bg-orange-50 text-orange-900' :
          workshop.color === 'purple' ? 'border-purple-500 bg-purple-50 text-purple-900' :
          workshop.color === 'red' ? 'border-red-500 bg-red-50 text-red-900' :
          workshop.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 text-yellow-900' :
          workshop.color === 'indigo' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' :
          'border-blue-500 bg-blue-50 text-blue-900'
        } shadow-md transition-all animate-fade-in`}>
          <button
        onClick={() => {
          if (workshop.id === 'customer-centric') setShowAWSSalesWorkshopAlert(false);
          if (workshop.id === 'pitching') setShowPitchingWorkshopAlert(false);
          if (workshop.id === 'ai-unlocked') setShowAIUnlockedWorkshopAlert(false);
          if (workshop.id === 'cv-workshop') setShowCVWorkshopAlert(false);
          if (workshop.id === 'gitlab') setShowGitlabWorkshopAlert(false);
          if (workshop.id === 'q-business') setShowQBusinessWorkshopAlert(false);
          if (workshop.id === 'onsite-hackathon') setShowOnsiteHackathonAlert(false);
        }}
        className={`absolute top-2 right-2 p-1 rounded-full hover:bg-${workshop.color}-100 transition-colors`}
        aria-label="Close alert"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex flex-col md:flex-row md:items-start md:gap-4">
        <div className="flex-shrink-0 mb-4 md:mb-0">
          <div className={`flex items-center justify-center h-12 w-12 rounded-full bg-${workshop.color}-100 text-${workshop.color}-600`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d={workshop.iconPath} />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">{workshop.title}</h2>
          <p className="text-sm md:text-base mb-4">{workshop.description}</p>
          <div className="space-y-2 text-sm md:text-base">
              <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-${workshop.color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h8M3 17h18a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v7a2 2 0 002 2z" />
                  </svg>
                  <p className="font-semibold">Date: {workshop.date}</p>
              </div>
              <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-${workshop.color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-semibold">Time: {workshop.time}</p>
              </div>
                    
              <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-${workshop.color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="font-semibold">Location: {workshop.location}</p>
              </div>
              
              {workshop.speaker && (
                  <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-${workshop.color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v-2.25m0 2.25a6.002 6.002 0 00-2.096-1.571M12 6.253a6.002 6.002 0 012.096-1.571m-2.096 1.571v12.253a6.002 6.002 0 01-2.096-1.571M12 18.506a6.002 6.002 0 012.096-1.571m-2.096 1.571h-.001m.001 0h.001" />
                      </svg>
                      <p className="font-semibold">Speaker: {workshop.speaker}</p>
                  </div>
              )}
          </div>
      </div>
      
      
      {!isEventStarted(workshop.startTime) && (
        <div className="mt-4 flex justify-end md:absolute md:bottom-6 md:right-6 md:mt-0">
          <a 
            href={workshop.rsvpLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`inline-flex items-center gap-2 px-4 py-2 font-semibold rounded-lg transition-all duration-200 text-sm shadow-lg hover:shadow-xl transform hover:scale-105 text-white ${
              workshop.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
              workshop.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
              workshop.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700' :
              workshop.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
              workshop.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
              workshop.color === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700' :
              workshop.color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' :
              'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {workshop.id === 'onsite-hackathon' ? 'View Location' : 'RSVP Here'}
          </a>
        </div>
      )}
      
      
      {isEventStarted(workshop.startTime) && (
        <div className="mt-4 flex justify-end md:absolute md:bottom-6 md:right-6 md:mt-0">
          <div className={`inline-flex items-center gap-2 px-4 py-2 font-semibold rounded-lg text-sm shadow-lg ${
            workshop.color === 'blue' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
            workshop.color === 'green' ? 'bg-green-100 text-green-800 border border-green-300' :
            workshop.color === 'orange' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
            workshop.color === 'purple' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
            workshop.color === 'red' ? 'bg-red-100 text-red-800 border border-red-300' :
            workshop.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
            workshop.color === 'indigo' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
            'bg-blue-100 text-blue-800 border border-blue-300'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Event Started
          </div>
        </div>
      )}
      </div>
    </div>
            ))}
          </div>
        )}
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
                Track your journey through the Great Malaysia AI Hackathon
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
                        
                        
                        {step.name === "Select Problem Statement" && problemsAnnounced && !problemsSelectionOpen && !hasSelectedProblem && !isLocked("/problems", user) && (
                          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-yellow-700">Status:</span>
                              <span className="text-sm font-bold text-yellow-700">Preview mode</span>
                            </div>
                          </div>
                        )}
                        
                        {step.name === "Select Problem Statement" && problemsSelectionOpen && !hasSelectedProblem && !isLocked("/problems", user) && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-green-700">Status:</span>
                              <span className="text-sm font-bold text-green-700">Selection is now open!</span>
                            </div>
                          </div>
                        )}

                        {step.name === "Select Problem Statement" && isLocked("/problems", user) && problemsAnnounced && !hasSelectedProblem && (
                          <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-red-700">Status:</span>
                              <span className="text-sm font-bold text-red-700">Selection period has ended</span>
                            </div>
                            {step.lockReason && (
                              <div className="mt-1">
                                <span className="text-sm text-red-600">{step.lockReason}</span>
                              </div>
                            )}
                          </div>
                        )}

                        
                        {user?.track === 'student' && step.name === "Select Problem Statement" && !problemsAnnounced && (
                          <CountdownTimer 
                            timeLeft={problemStatementTimeLeft} 
                            label="Time until problem statements are released" 
                          />
                        )}
                        
                        {user?.track === 'student' && step.name === "Select Problem Statement" && problemsAnnounced && !problemsSelectionOpen && (
                          <CountdownTimer 
                            timeLeft={problemSelectionTimeLeft} 
                            label="Time until problem selection opens" 
                          />
                        )}
                        
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
                        
                        {step.waiting && step.name !== "Select Problem Statement" && (
                          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-yellow-700">Status:</span>
                              <span className="text-sm font-bold text-yellow-700">Waiting for announcement</span>
                            </div>
                          </div>
                        )}
                        
                        {step.locked && !step.completed && step.name !== "Select Problem Statement" && (
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
                    : "Register your team for the AWS AI Hackathon."}
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
                            <div className="flex justify-between">
                                <p className="font-medium">Team Leader:</p>
                                <p>{user?.email}</p>
                            </div>
                            
                            {user?.track && (
                                <div className="flex justify-between">
                                    <p className="font-medium">Team Track:</p>
                                    <p>{user.track.charAt(0).toUpperCase() + user.track.slice(1)}</p>
                                </div>
                            )}
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
                {user?.track !== 'corporate' && (
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/problems">
                      <div className="flex items-center">
                        {isLocked("/problems", user) && <Lock size={14} className="mr-2" />}
                        <span>View Problem Statements</span>
                      </div>
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/submission">
                    <div className="flex items-center">
                      {isLocked("/submission", user) && <Lock size={14} className="mr-2" />}
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
                      {isLocked("/feedback", user) && <Lock size={14} className="mr-2" />}
                      <span>View Judge Feedback</span>
                    </div>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <a href="https://linktr.ee/greataihackathon" target="_blank" rel="noopener noreferrer">
                    <div className="flex items-center">
                      <span>View Our Linktree</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </a>
                </Button>
              </CardContent>
            </Card>
            <Card className="col-span-1 md:col-span-3">
              <CardHeader>
                <CardTitle>Hackathon Timeline</CardTitle>
                <CardDescription>Important dates for the Great Malaysia AI Hackathon</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="relative">
                  <div className="absolute left-2 sm:left-3 md:left-5 top-0 bottom-0 w-0.5 bg-aws-gray"></div>
                  <div className="space-y-6 sm:space-y-8">
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">1</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Registration Open</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">
                          August 1 - September 10, 2025
                        </p>
                        <p className="text-sm sm:text-base">Register your team to participate in the hackathon.</p>
                      </div>
                    </div>
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">2</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Pre-Hackathon Briefing Session</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">
                          August 25, 2025
                        </p>
                        <p className="text-sm sm:text-base">Essential orientation session covering hackathon guidelines, expectations, and preparation strategies for all registered participants.</p>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <a 
                            href="https://www.youtube.com/watch?v=I1yRKL5iFfE&ab_channel=AsiaPacificUniversityofTechnology%26Innovation%28APU%29" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C1.85 3.4.83 4.42.83 6.957v10.085c0 2.537 1.02 3.558 3.555 3.775 3.599.245 11.626.246 15.23 0 2.535-.217 3.555-1.238 3.555-3.775V6.957c0-2.537-1.02-3.558-3.555-3.773zM9.5 15.568V8.432L15.85 12 9.5 15.568z"/>
                            </svg>
                            Watch on YouTube
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">3</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Workshops & Enablements</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">
                          September 3 - September 19, 2025
                        </p>
                        <p className="text-sm sm:text-base">Immersive learning sessions featuring AWS services, Creative Thinking and CV Writing.</p>
                      </div>
                    </div>
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">4</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Problem Statements Released (For Student Track Only)</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">
                          {dateTimeFormatter.format(PROBLEMS_START_DATE)}
                        </p>
                        <p className="text-sm sm:text-base">Problem statements are released for viewing. Selection opens later.</p>
                      </div>
                    </div>
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">5</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Problem Selection Opens (For Student Track Only)</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">
                          {dateTimeFormatter.format(PROBLEMS_SELECTION_DATE)}
                        </p>
                        <p className="text-sm sm:text-base">Teams can now select their problem statements.</p>
                      </div>
                    </div>
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">6</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Hackathon Starts</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">
                          {longDateFormatter.format(HACKATHON_START_DATE)}
                        </p>
                        <p className="text-sm sm:text-base">The official start of the hackathon! Good luck to all participants.</p>
                      </div>
                    </div>
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">7</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Submission Period</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">
                          {shortDateFormatter.format(SUBMISSION_START_DATE)} - {longDateFormatter.format(SUBMISSION_END_DATE)}
                        </p>
                        <p className="text-sm sm:text-base">Submit your project and video during this period.</p>
                      </div>
                    </div>
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">8</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Finalist Announcement</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">
                          {longDateFormatter.format(FINALISTS_ANNOUNCEMENT_DATE)}
                        </p>
                        <p className="text-sm sm:text-base">Finalists will be announced via Discord and email.</p>
                      </div>
                    </div>
                    <div className="relative pl-6 sm:pl-8 md:pl-12">
                      <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-aws-light-blue flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base">9</div>
                      <div className="pr-3 sm:pr-4">
                        <h3 className="font-bold text-base sm:text-lg">Winners Announced</h3>
                        <p className="text-muted-foreground mb-1 text-sm sm:text-base">
                          {longDateFormatter.format(WINNERS_ANNOUNCEMENT_DATE)}
                        </p>
                        <p className="text-sm sm:text-base">Finalist presentations and winners will be announced.</p>
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
                        Participants will be notified of any changes through official communication channels (Discord).
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Dashboard;