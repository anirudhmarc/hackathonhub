import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useLocation } from "react-router-dom";
import { JudgeSelect } from "./JudgeSelect";
import { useHackathon } from "@/contexts/HackathonContext";
import { useCurrentHackathon } from "@/contexts/CurrentHackathonContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { List, ChevronDown } from "lucide-react";
import BrandLockup from "./BrandLockup";

export const Header = () => {
  const location = useLocation();
  const isTeamsPath = location.pathname.startsWith('/teams');
  const isResultsPath = location.pathname.startsWith('/results');
  const isRubricPath = location.pathname.startsWith('/rubric');
  const { state, dispatch } = useHackathon();
  const { hackathons, currentHackathonId, setCurrentHackathonId } = useCurrentHackathon();
  const { user, logout } = useAuth();
  const [isJudgeDialogOpen, setIsJudgeDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);

  if (location.pathname === "/login") {
    return null;
  }

  const isFinalStage = state.currentStage?.stage_id === "stage_2";

  return (
    <header className="border-b w-full">
      <div className="w-full py-3 px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                AWS Hackathon
              </h1>
              <p className="text-muted-foreground text-sm">
                Judging System
              </p>
            </div>
            <div className="ml-4 flex items-center">
              <BrandLockup size="sm" />
            </div>

            <nav className="ml-6 flex gap-2 items-center">
              <div className="rounded-full bg-muted/30 p-1 flex gap-1 items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="default"
                      className={`relative z-10 rounded-full px-4 py-2 justify-center transition-all duration-300 ease-in-out transform-gpu hover:scale-105 ${
                        isTeamsPath ? 'bg-primary text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      Teams <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link 
                        to="/teams" 
                        onClick={() => {
                          const prelimStage = state.judgingStages?.find(stage => 
                            stage.stage_name?.toLowerCase().includes('preliminary') || 
                            stage.stage_name?.toLowerCase().includes('round 1')
                          );
                          if (prelimStage) {
                            dispatch({ type: "SET_CURRENT_STAGE", payload: prelimStage });
                          }
                        }}
                        className="w-full"
                      >
                        Preliminary
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link 
                        to="/teams" 
                        onClick={() => {
                          const finalStage = state.judgingStages?.find(stage => 
                            stage.stage_name?.toLowerCase().includes('final') || 
                            stage.stage_name?.toLowerCase().includes('round 2')
                          );
                          if (finalStage) {
                            dispatch({ type: "SET_CURRENT_STAGE", payload: finalStage });
                          }
                        }}
                        className="w-full"
                      >
                        Final
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="rounded-full bg-muted/30 p-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="default"
                      className={`relative z-10 rounded-full px-4 py-2 justify-center transition-all duration-300 ease-in-out transform-gpu hover:scale-105 ${
                        isResultsPath ? 'bg-primary text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      Leaderboard <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link 
                        to="/results" 
                        onClick={() => {
                          const prelimStage = state.judgingStages?.find(stage => 
                            stage.stage_name?.toLowerCase().includes('preliminary') || 
                            stage.stage_name?.toLowerCase().includes('round 1')
                          );
                          if (prelimStage) {
                            dispatch({ type: "SET_CURRENT_STAGE", payload: prelimStage });
                          }
                        }}
                        className="w-full"
                      >
                        Preliminary
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link 
                        to="/results" 
                        onClick={() => {
                          const finalStage = state.judgingStages?.find(stage => 
                            stage.stage_name?.toLowerCase().includes('final') || 
                            stage.stage_name?.toLowerCase().includes('round 2')
                          );
                          if (finalStage) {
                            dispatch({ type: "SET_CURRENT_STAGE", payload: finalStage });
                          }
                        }}
                        className="w-full"
                      >
                        Final
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="rounded-full bg-muted/30 p-1">
                <Button
                  asChild
                  variant="ghost"
                  size="default"
                  className={`relative z-10 rounded-full px-4 py-2 justify-center transition-all duration-300 ease-in-out transform-gpu hover:scale-105 ${
                    isRubricPath ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  <Link to="/rubric">Rubric</Link>
                </Button>
              </div>
            </nav>

            {state.judgingStages && state.judgingStages.length > 0 && (
              <div className="ml-2 md:hidden">
                <Button
                  aria-label="Change judging stage"
                  onClick={() => setIsStageDialogOpen(true)}
                  size="icon"
                  variant="ghost"
                  title="Change judging stage"
                >
                  <List className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {hackathons.length > 1 && (
              <Select
                value={currentHackathonId ?? undefined}
                onValueChange={(value) => setCurrentHackathonId(value)}
              >
                <SelectTrigger className="w-[220px]" aria-label="Select hackathon">
                  <SelectValue placeholder="Select hackathon" />
                </SelectTrigger>
                <SelectContent>
                  {hackathons.map((hackathon) => (
                    <SelectItem key={hackathon.id} value={hackathon.id}>
                      {hackathon.name || hackathon.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {state.selectedJudge && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold text-sm">
                  {(() => {
                    const parts = state.selectedJudge.name.trim().split(/\s+/);
                    if (parts.length === 0) return "";
                    const first = parts[0][0] || '';
                    const lastFirst = parts[parts.length - 1][0] || '';
                    return (first + lastFirst).toUpperCase();
                  })()}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{state.selectedJudge.name}</span>
                  <Button
                    variant="link"
                    className="text-xs p-0 h-auto"
                    onClick={logout}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isJudgeDialogOpen} onOpenChange={setIsJudgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Judge</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <JudgeSelect />
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};
