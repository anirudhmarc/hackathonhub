
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Lock, AlertCircle, CircleDot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, useRef } from "react";
import axios from 'axios';

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;
const PROBLEMS_START_DATE = new Date(import.meta.env.VITE_PROBLEMS_START_DATE);
const PROBLEMS_SELECTION_DATE = new Date(import.meta.env.VITE_PROBLEMS_SELECTION_DATE);
const PROBLEMS_SELECTION_END_DATE = new Date(import.meta.env.VITE_PROBLEMS_SELECTION_END_DATE);
const HACKATHON_START_DATE = new Date(import.meta.env.VITE_HACKATHON_START_DATE);

interface DescriptionWithOverflowProps {
  description: string;
  containerHeight: string;
  onReadMore: () => void;
}

const DescriptionWithOverflow: React.FC<DescriptionWithOverflowProps> = ({ 
  description, 
  containerHeight, 
  onReadMore 
}) => {
  const contentRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current && containerRef.current) {
        try {
          const contentHeight = contentRef.current.scrollHeight;
          const containerHeight = containerRef.current.clientHeight;
          setIsOverflowing(contentHeight > containerHeight);
        } catch (error) {
          setIsOverflowing(false);
        }
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [description]);

  return (
    <>
      <div ref={containerRef} className={`${containerHeight} overflow-hidden relative`}>
        <p ref={contentRef} className="whitespace-pre-line text-sm leading-relaxed">
          {description}
        </p>
        {isOverflowing && (
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent"></div>
        )}
      </div>
  <div className="mt-3">
        {isOverflowing && (
          <button
            onClick={onReadMore}
            className="text-primary hover:text-primary/80 text-sm font-medium hover:underline focus:outline-none"
          >
            Read more...
          </button>
        )}
      </div>
    </>
  );
};

interface ProblemStatement {
  problem_id: string;
  problem_title: string;
  problem_description: string;
  problem_tag: string;
  problem_max_slots: number;
  current_slots_taken: number;
  track_name: string;
  
  selected: boolean;
  remainingSlots: number;
}

const Problems = () => {
  const { user, idToken, updateUserTeam, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [problems, setProblems] = useState<ProblemStatement[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [problemToSelect, setProblemToSelect] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProblemDetail, setSelectedProblemDetail] = useState<ProblemStatement | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const hackathonStarted = new Date().getTime() >= HACKATHON_START_DATE.getTime();
  const problemsAnnounced = new Date().getTime() >= PROBLEMS_START_DATE.getTime();
  const problemsSelectionOpen = new Date().getTime() >= PROBLEMS_SELECTION_DATE.getTime() && new Date().getTime() < PROBLEMS_SELECTION_END_DATE.getTime();
  const problemsSelectionClosed = new Date().getTime() >= PROBLEMS_SELECTION_END_DATE.getTime();

  
  const hasRegisteredTeam = !!user?.teamName;
  const userHasSelectedProblem = !!user?.problemId;

  const canSelectProblem = hasRegisteredTeam && !userHasSelectedProblem && problemsSelectionOpen;

  const handleOpenProblemDetail = (problem: ProblemStatement) => {
    setSelectedProblemDetail(problem);
    setIsDetailModalOpen(true);
  };

  useEffect(() => {
    const fetchProblemStatements = async () => {
      if (!idToken || !hasRegisteredTeam) {
        setLoading(false);
        return;
      }
      if (!problemsAnnounced) {
        setLoading(false);
        return;
      }

      try {
    setLoading(true);
    setError(null);
    const response = await axios.get<ProblemStatement[]>(
      `${API_GATEWAY_BASE_URL}/participant/problems`,
      {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      }
    );

  const fetchedProblems: ProblemStatement[] = response.data.map((p) => {
            const maxSlots = typeof p.problem_max_slots === 'string' ? parseInt(p.problem_max_slots, 10) : p.problem_max_slots;
            const slotsTaken = typeof p.current_slots_taken === 'string' ? parseInt(p.current_slots_taken, 10) : p.current_slots_taken;

            const safeMaxSlots = isNaN(maxSlots) ? 0 : maxSlots;
            const safeSlotsTaken = isNaN(slotsTaken) ? 0 : slotsTaken;

      return {
    problem_id: p.problem_id,
    problem_title: p.problem_title,
    problem_description: p.problem_description,
    problem_tag: p.problem_tag,
    problem_max_slots: safeMaxSlots,
    current_slots_taken: safeSlotsTaken,
    track_name: p.track_name,
    remainingSlots: safeMaxSlots - safeSlotsTaken,
    selected: p.problem_id === user?.problemId
      };
        });
        setProblems(fetchedProblems);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch problem statements:", err);
        const errorMessage = axios.isAxiosError(err) && err.response?.data?.message 
          ? err.response.data.message
          : "Failed to load problem statements.";
        setError(errorMessage);
        setLoading(false);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    if (!authLoading && idToken) {
      fetchProblemStatements();
    }
  }, [hasRegisteredTeam, hackathonStarted, problemsAnnounced, problemsSelectionOpen, idToken, toast, user?.problemId, authLoading]);

  const openConfirmDialog = (problemId: string) => {
    if (!canSelectProblem) {
      if (problemsSelectionClosed) {
        toast({
          title: "Selection Period Ended",
          description: `Problem selection closed on ${formatDate(PROBLEMS_SELECTION_END_DATE)}.`,
          variant: "destructive",
        });
      } else if (!problemsSelectionOpen) {
        toast({
          title: "Selection Not Open",
          description: `Problem selection will open on ${formatDate(PROBLEMS_SELECTION_DATE)}.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Action Not Allowed",
          description: "You must register a team to select a problem statement.",
          variant: "destructive",
        });
      }
      return;
    }
    
    const selectedProblem = problems.find(p => p.problem_id === problemId);
    if (selectedProblem && selectedProblem.remainingSlots === 0) {
        toast({
            title: "Problem Full",
            description: "This problem has no slots left.",
            variant: "destructive",
        });
        return;
    }

    setProblemToSelect(problemId);
    setConfirmationDialogOpen(true);
  }

  const handleSelectProblem = async () => {
      if (!problemToSelect || !user?.teamId) {
          toast({
              title: "Selection Error",
              description: "No problem selected or team ID missing. Please ensure your team is registered.",
              variant: "destructive",
          });
          setProblemToSelect(null);
          setConfirmationDialogOpen(false);
          return;
      }
      if (!idToken) {
          toast({
              title: "Authentication Error",
              description: "Authentication token missing. Please log in again.",
              variant: "destructive",
          });
          setProblemToSelect(null);
          setConfirmationDialogOpen(false);
          return;
      }

      try {
      const response = await axios.post(
        `${API_GATEWAY_BASE_URL}/participant/problems`,
        {
          problemId: problemToSelect
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        }
      );

          console.log("Problem selection API response:", response.data);

          updateUserTeam(user.teamName, user.teamId, problemToSelect, user.track, user.videoUrl, user.hasSubmitted);

          toast({
              title: "Problem Selected",
              description: `Your team "${user?.teamName}" successfully selected a problem.`,
          });

      } catch (error) {
          console.error("Error selecting problem:", error);
          const errorMessage = axios.isAxiosError(error) && error.response
                            ? (error.response.data.message || error.response.statusText || `Status: ${error.response.status}`)
                            : error.message;
          toast({
              title: "Selection Error",
              description: `Failed to select problem: ${errorMessage}`,
              variant: "destructive",
          });
      } finally {
          setProblemToSelect(null);
          setConfirmationDialogOpen(false);
      }
  };

  const filteredProblems = problems.filter(problem => {
    return problem.problem_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.problem_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.problem_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.track_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getSelectedProblemDetails = () => {
    return problems.find(problem => problem.problem_id === user?.problemId);
  };

    const getSlotBadgeColor = (slots: number) => {
    if (slots <= 0) return "bg-gray-400 text-white border-transparent";
    if (slots <= 1) return "bg-[#ea384c] text-white border-transparent";
    if (slots <= 3) return "bg-[#FEF7CD] text-black border-transparent";
    return "bg-[#F2FCE2] text-black border-transparent";
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const shouldShowBadges = (problem: ProblemStatement) => {
    return (problem.problem_tag && problem.problem_tag.trim() && !['', '-', 'N/A'].includes(problem.problem_tag)) ||
           (problem.track_name && problem.track_name.trim() && !['', '-', 'N/A'].includes(problem.track_name)) ||
           problemsSelectionOpen;
  };

  const renderBadges = (problem: ProblemStatement) => {
    if (!shouldShowBadges(problem)) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {problem.problem_tag && problem.problem_tag.trim() && !['', '-', 'N/A'].includes(problem.problem_tag) && (
          <Badge variant="outline">{problem.problem_tag}</Badge>
        )}
        {problem.track_name && problem.track_name.trim() && !['', '-', 'N/A'].includes(problem.track_name) && (
          <Badge variant="outline">{problem.track_name}</Badge>
        )}
        {problemsSelectionOpen && !problem.selected && (
          <Badge className={cn(getSlotBadgeColor(problem.remainingSlots))}>
            {problem.remainingSlots} {problem.remainingSlots === 1 ? "slot" : "slots"} remaining
          </Badge>
        )}
      </div>
    );
  };

  const renderContent = () => {

    if (authLoading) {
        return (
            <Card>
                <CardContent className="p-12 flex justify-center">
                    <div className="flex flex-col items-center">
                        <div className="mb-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                        <p className="text-muted-foreground">Loading authentication data...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!hasRegisteredTeam) {
      return (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center text-center">
              <Lock size={48} className="mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">Team Registration Required</h3>
              <p className="mb-4 max-w-md text-muted-foreground">
                You need to register a team before you can access problem statements.
              </p>
              <Button asChild>
                <Link to="/dashboard">Register a Team</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!problemsAnnounced) {
  return (
    <Card>
      <CardContent className="p-12">
        <div className="flex flex-col items-center text-center">
          <Lock size={48} className="mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">Problem Statements Not Released Yet</h3>
          <p className="mb-4 max-w-md text-muted-foreground">
            Problem statements will be announced on {formatDate(PROBLEMS_START_DATE)}. Please check back later.
          </p>
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
              <p className="text-muted-foreground">Loading problem statements...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

  if (error) {
      return (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center text-center">
              <AlertCircle size={48} className="mb-4 text-red-500" />
              <h3 className="text-xl font-bold mb-2">Error Loading Problems</h3>
              <p className="mb-4 max-w-md text-muted-foreground">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    const selectedProblemDetails = getSelectedProblemDetails();

    return (
      <>
        
        {userHasSelectedProblem && selectedProblemDetails ? (
          <Card className="mb-8 border-2 border-primary">
            <CardHeader className="bg-primary/5">
              <div className="flex justify-between items-center">
                <CardTitle>Your Selected Problem</CardTitle>
                <BookOpen className="text-primary" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">{selectedProblemDetails.problem_title}</h2>
                <div>
                  <div className="whitespace-pre-line text-sm leading-relaxed">
                    {selectedProblemDetails.problem_description}
                  </div>
                </div>
                
                {renderBadges(selectedProblemDetails)}
              </div>
            </CardContent>
            <CardFooter className="bg-primary/5 border-t border-primary/20">
              <p className="text-sm text-muted-foreground mt-3">
                Problem statement selected for your team: <strong>{user?.teamName}</strong>
              </p>
            </CardFooter>
          </Card>
        ) : null}

        
        {
          (problemsAnnounced && !userHasSelectedProblem) && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <CardTitle>
                      {problemsSelectionClosed 
                        ? "Problem Statements (Selection Closed)" 
                        : problemsSelectionOpen 
                          ? "Available Problem Statements" 
                          : "Problem Statements (Preview)"
                      }
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {problemsSelectionClosed
                        ? `Problem selection closed on ${formatDate(PROBLEMS_SELECTION_END_DATE)}. No more selections are allowed.`
                        : problemsSelectionOpen 
                          ? "Select a problem statement for your team on a first-come, first-served basis."
                          : `Problem selection will open on ${formatDate(PROBLEMS_SELECTION_DATE)}. You can view the problems now but cannot select yet.`
                      }
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-3">
                    {problemsSelectionClosed ? (
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <span className="text-xs font-medium text-red-600">Selection Closed</span>
                      </div>
                    ) : problemsSelectionOpen ? (
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium text-green-600">Selection Open</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                        </span>
                        <span className="text-xs font-medium text-yellow-600">Preview Mode</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date().toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                
                <div className="flex flex-col gap-4 mb-6">
                  <div className="w-full">
                    <Input
                      placeholder="Search problem statements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                
                <div className="mb-6 flex flex-wrap gap-4">
                  <div className="bg-muted/50 px-4 py-2 rounded-md">
                    <span className="text-sm font-medium">Total Problems: {problems.length}</span>
                  </div>
                  {problemsSelectionOpen && (
                    <>
                      <div className="bg-muted/50 px-4 py-2 rounded-md">
                        <span className="text-sm font-medium">Problems (Available): {problems.filter(p => p.remainingSlots > 0).length}</span>
                      </div>
                      <div className="bg-muted/50 px-4 py-2 rounded-md">
                        <span className="text-sm font-medium">Problems (Full): {problems.filter(p => p.remainingSlots === 0).length}</span>
                      </div>
                    </>
                  )}
                </div>

                
                {filteredProblems.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No problem statements found matching your criteria.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProblems.map((problem) => {
                    return (
                      <div
                        key={problem.problem_id}
                        className={`flex flex-col h-full border rounded-lg overflow-hidden ${problem.selected ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="text-xl font-bold mb-2">{problem.problem_title}</h3>
                          <div className="flex-1">
                            <DescriptionWithOverflow
                              description={problem.problem_description}
                              containerHeight="h-36"
                              onReadMore={() => handleOpenProblemDetail(problem)}
                            />
                          </div>
                          
                          
                          {renderBadges(problem)}
                        </div>
                      <div className="p-4 bg-muted/30 border-t">
                        {problem.selected ? (
                          <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium text-center">
                            Selected
                          </div>
                        ) : problemsSelectionClosed ? (
                          <div className="px-4 py-2 bg-red-100 text-red-800 rounded-md font-medium text-center border border-red-300">
                            Selection Closed
                          </div>
                        ) : problemsSelectionOpen ? (
                          <Button
                            onClick={() => openConfirmDialog(problem.problem_id)}
                            disabled={!canSelectProblem || problem.remainingSlots === 0}
                            className="w-full"
                          >
                            {problem.remainingSlots === 0 ? "No Slots Left" : "Select Problem"}
                          </Button>
                        ) : (
                          <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md font-medium text-center border border-yellow-300">
                            Selection opens at {PROBLEMS_SELECTION_DATE.toLocaleTimeString('en-US', { 
                              timeZone: 'Asia/Kuala_Lumpur',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )
        }

        
        <AlertDialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Problem Selection</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to select this problem statement? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProblemToSelect(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSelectProblem}>Confirm Selection</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        
        <AlertDialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">
                {selectedProblemDetail?.problem_title}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="mb-4">
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {selectedProblemDetail?.problem_description}
                </p>
              </div>
              
              {selectedProblemDetail && renderBadges(selectedProblemDetail)}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDetailModalOpen(false)}>
                Close
              </AlertDialogCancel>
              {!selectedProblemDetail?.selected && problemsSelectionOpen && canSelectProblem && selectedProblemDetail?.remainingSlots && selectedProblemDetail.remainingSlots > 0 && (
                <AlertDialogAction onClick={() => {
                  setIsDetailModalOpen(false);
                  openConfirmDialog(selectedProblemDetail.problem_id);
                }}>
                  Select This Problem
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  return (
    <>
      <SEOHead 
        title="Problem Statements - Great AI Hackathon Malaysia 2025 | HackHub"
        description="Browse and select problem statements for the Great AI Hackathon Malaysia 2025. Choose from innovative AI challenges across multiple tracks including healthcare, fintech, sustainability, and more. Join AWS AI Innovation Challenge."
        keywords="AI Hackathon Problems, Great AI Hackathon Malaysia Problems, HackHub Problem Statements, AWS AI Challenge Problems, Malaysia AI Competition Challenges, Hackathon Problem Selection"
        canonical="/problems"
      />
      <div className="aws-container py-8">
        <h1 className="text-3xl font-bold mb-8">Problem Statements</h1>
        {renderContent()}
      </div>
    </>
  );
};

export default Problems;