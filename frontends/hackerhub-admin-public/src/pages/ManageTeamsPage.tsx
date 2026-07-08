import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentHackathon } from '@/contexts/CurrentHackathonContext';
import NoHackathonSelected from '@/components/NoHackathonSelected';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2, RefreshCw, Trophy, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import axios, { isAxiosError } from 'axios';

interface Team {
  id: string;
  name: string;
  leader_email: string;
  problem_id: string | null;
  problem_title: string | null;
  problem_description: string | null;
  track_id: string | null;
  track: string | null;
  has_submitted: boolean;
  is_finalist: boolean;
}

interface Problem {
  id: string;
  title: string;
  trackId: string;
  maxSlots: number;
  currentSlots: number;
  isAvailable: boolean;
}

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;

interface Participant {
  participant_id: string;
  teamName: string;
  track: string;
  memberCount: number;
  status: string;
}

const ManageTeamsPage: React.FC = () => {
  const { idToken } = useAuth();
  const { currentHackathonId } = useCurrentHackathon();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showProblemSubmissionStats = true;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formState, setFormState] = useState({
    teamName: '',
    leaderEmail: '',
    problemId: '',
    trackId: '',
    hasSubmitted: false,
    isFinalist: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [isFinalistModalOpen, setIsFinalistModalOpen] = useState(false);
  const [isSettingFinalists, setIsSettingFinalists] = useState(false);
  const [finalistSearchTerm, setFinalistSearchTerm] = useState('');
  
  const [problemFilter, setProblemFilter] = useState('all');
  const [showProblemBreakdown, setShowProblemBreakdown] = useState(false);
  const [showSubmissionBreakdown, setShowSubmissionBreakdown] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'leader_email' | 'problem_title' | 'has_submitted' | 'is_finalist' | null>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  

  const fetchTeams = useCallback(async () => {
    if (!idToken || !currentHackathonId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch teams data
      const teamsResponse = await axios.get(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/teams`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      setTeams(teamsResponse.data.teams);
      setProblems(teamsResponse.data.problems);

      // Fetch participants data from DynamoDB
      try {
        const participantsResponse = await axios.get(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/participants`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        // API returns array directly, not wrapped in a property
        const participantsData = Array.isArray(participantsResponse.data) 
          ? participantsResponse.data 
          : (participantsResponse.data.participants || []);
        setParticipants(participantsData);
      } catch (participantErr) {
        console.warn("Could not fetch participants data:", participantErr);
        setParticipants([]);
      }
  } catch (err: unknown) {
  console.error("Error fetching teams:", err);
      if (isAxiosError(err)) {
        setError(err.message || "Failed to fetch teams.");
        toast({ title: "Error", description: err.message || "Failed to fetch teams.", variant: "destructive" });
      } else {
        setError("An unknown error occurred.");
        toast({ title: "Error", description: "An unknown error occurred.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [idToken, currentHackathonId, toast]);

  const handleAddEditTeam = async () => {
    setIsSubmitting(true);
    try {
      const method = editingTeam ? 'PUT' : 'POST';
      const url = editingTeam ? `${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/teams/${editingTeam.id}` : `${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/teams`;

      const payload = {
        team_name: formState.teamName,
        leader_email: formState.leaderEmail,
        problem_id: formState.problemId,
        track_id: formState.trackId,
        has_submitted: formState.hasSubmitted,
        is_finalist: formState.isFinalist,
      };

      await axios({
        method: method,
        url: url,
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      });

      toast({ title: "Success", description: `Team ${editingTeam ? 'updated' : 'added'} successfully!`, variant: "default" });
      setIsDialogOpen(false);
      setEditingTeam(null);
      setFormState({ teamName: '', leaderEmail: '', problemId: '', trackId: '', hasSubmitted: false, isFinalist: false });
      fetchTeams();
  } catch (err: unknown) {
  console.error("Error saving team:", err);
      if (isAxiosError(err) && err.response) {
        const errorMessage = err.response.data?.message || err.message || "Failed to save team.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else if (err instanceof Error) {
        const errorMessage = err.message || "Failed to save team.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to save team.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    try {
      await axios.delete(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/teams/${teamId}`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      toast({ title: "Success", description: "Team deleted successfully!", variant: "default" });
      fetchTeams();
    } catch (err: unknown) {
      console.error("Error deleting team:", err);
      if (isAxiosError(err) && err.response) {
        const errorMessage = err.response.data?.message || err.message || "Failed to delete team.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else if (err instanceof Error) {
        const errorMessage = err.message || "Failed to delete team.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to delete team.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };
  
  const handleSetFinalists = async () => {
    setIsSettingFinalists(true);
    try {
      const allTeamIds = teams.map(t => t.id);
      
      const updatePromises = allTeamIds.map(async teamId => {
        const isFinalist = selectedTeams.includes(teamId);
        await axios.put(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/teams/${teamId}`, {
          is_finalist: isFinalist,
        }, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        });
      });
      
      await Promise.all(updatePromises);
      
      toast({ title: "Success", description: "Finalist status updated successfully!", variant: "default" });
      setIsFinalistModalOpen(false);
      setSelectedTeams([]);
      fetchTeams();
    } catch (err: unknown) {
      console.error("Error setting finalists:", err);
      if (isAxiosError(err) && err.response) {
        const errorMessage = err.response.data?.message || err.message || "Failed to set finalists.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else if (err instanceof Error) {
        const errorMessage = err.message || "Failed to set finalists.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to set finalists.", variant: "destructive" });
      }
    } finally {
      setIsSettingFinalists(false);
    }
  };

  useEffect(() => {
    if (idToken && currentHackathonId) {
      fetchTeams();
    }
  }, [idToken, currentHackathonId, fetchTeams]);

  useEffect(() => {
    if (editingTeam) {
      const problemId = editingTeam.problem_id || '';
      const trackId = editingTeam.track_id || '';

      setFormState({
        teamName: editingTeam.name,
        leaderEmail: editingTeam.leader_email,
        problemId: problemId,
        trackId: trackId,
        hasSubmitted: editingTeam.has_submitted,
        isFinalist: editingTeam.is_finalist,
      });
      setIsDialogOpen(true);
    }
  }, [editingTeam]);

  const handleOpenDialog = (teamToEdit: Team | null = null) => {
    setEditingTeam(teamToEdit);
    const problemId = teamToEdit?.problem_id || '';
    const trackId = teamToEdit?.track_id || '';

    setFormState({
      teamName: teamToEdit?.name || '',
      leaderEmail: teamToEdit?.leader_email || '',
      problemId: problemId,
      trackId: trackId,
      hasSubmitted: teamToEdit?.has_submitted || false,
      isFinalist: teamToEdit?.is_finalist || false,
    });
    setIsDialogOpen(true);
  };

  const handleOpenFinalistModal = () => {
    setSelectedTeams(teams.filter(t => t.is_finalist).map(t => t.id));
    setFinalistSearchTerm('');
    setIsFinalistModalOpen(true);
  };

  const filteredFinalistTeams = useMemo(() => {
    if (!finalistSearchTerm.trim()) {
      return teams;
    }
    
    const searchLower = finalistSearchTerm.toLowerCase();
    return teams.filter(team =>
      team.name.toLowerCase().includes(searchLower) ||
      team.leader_email.toLowerCase().includes(searchLower) ||
      (team.problem_title && team.problem_title.toLowerCase().includes(searchLower))
    );
  }, [teams, finalistSearchTerm]);

  const { totalTeams, totalParticipants, finalistTeamsCount, problemStatementStats, submissionStats } = useMemo(() => {
    const totalTeams = teams.length;
    const finalistTeamsCount = teams.filter(t => t.is_finalist).length;

    const teamsWithProblem = teams.filter(t => t.problem_id && t.problem_id !== '').length;
    const teamsWithoutProblem = totalTeams - teamsWithProblem;
    const teamsSubmitted = teams.filter(t => t.has_submitted).length;
    const teamsNotSubmitted = totalTeams - teamsSubmitted;

    // Total approved participant headcount from DynamoDB data.
    const totalParticipants = participants
      .filter(p => p.status === 'APPROVED')
      .reduce((sum, p) => sum + (p.memberCount || 0), 0);

    return {
      totalTeams,
      totalParticipants,
      finalistTeamsCount,
      problemStatementStats: {
        withProblem: teamsWithProblem,
        withoutProblem: teamsWithoutProblem
      },
      submissionStats: {
        submitted: teamsSubmitted,
        notSubmitted: teamsNotSubmitted
      }
    };
  }, [teams, participants]);

  const filteredTeams = useMemo(() => {
    let result = teams.filter(team => {
      const matchesProblem = problemFilter === 'all' || team.problem_id === problemFilter;
      return matchesProblem;
    });

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(team => 
        team.name.toLowerCase().includes(searchLower) ||
        team.leader_email.toLowerCase().includes(searchLower) ||
        (team.problem_title && team.problem_title.toLowerCase().includes(searchLower))
      );
    }

    if (sortBy) {
      result = [...result].sort((a, b) => {
        let aValue: string | boolean = '';
        let bValue: string | boolean = '';

        switch (sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'leader_email':
            aValue = a.leader_email.toLowerCase();
            bValue = b.leader_email.toLowerCase();
            break;
          case 'problem_title':
            aValue = (a.problem_title || '').toLowerCase();
            bValue = (b.problem_title || '').toLowerCase();
            break;
          case 'has_submitted':
            aValue = a.has_submitted;
            bValue = b.has_submitted;
            break;
          case 'is_finalist':
            aValue = a.is_finalist;
            bValue = b.is_finalist;
            break;
        }

        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          if (sortOrder === 'asc') {
            return Number(aValue) - Number(bValue);
          } else {
            return Number(bValue) - Number(aValue);
          }
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          if (sortOrder === 'asc') {
            return aValue.localeCompare(bValue);
          } else {
            return bValue.localeCompare(aValue);
          }
        }

        return 0;
      });
    }

    return result;
  }, [teams, problemFilter, searchTerm, sortBy, sortOrder]);

  const handleSort = (column: 'name' | 'leader_email' | 'problem_title' | 'has_submitted' | 'is_finalist') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (!currentHackathonId) {
    return <NoHackathonSelected />;
  }

  if (loading) {
    return (
      <div className="aws-container py-8 flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading teams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aws-container py-8 text-center text-red-600">
        <p className="text-xl font-bold mb-4">Error Loading Teams</p>
        <p>{error}</p>
        <Button onClick={fetchTeams} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="aws-container py-8">
  <h1 className="text-3xl font-bold mb-6">Manage Teams</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Hackathon Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex-1 flex items-center justify-between p-4 bg-muted/50 rounded-md">
              <h3 className="font-medium text-lg">Total Teams:</h3>
              <span className="text-2xl font-bold">{totalTeams}</span>
            </div>

            <div className="flex-1 flex items-center justify-between p-4 bg-muted/50 rounded-md">
              <h3 className="font-medium text-lg">Total Participants:</h3>
              <span className="text-2xl font-bold">{totalParticipants}</span>
            </div>
          </div>

          {showProblemSubmissionStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="flex-1 flex flex-col p-4 bg-muted/50 rounded-md">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowProblemBreakdown(!showProblemBreakdown)}
                >
                  <h3 className="font-medium text-lg">Problem Selection:</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{problemStatementStats.withProblem}</span>
                    {showProblemBreakdown ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>
                {showProblemBreakdown && (
                  <div className="mt-4 space-y-2 pl-4 border-l-2 border-gray-300">
                    <div className="flex justify-between items-center text-sm">
                      <span>Teams with Problem:</span>
                      <span className="font-bold">{problemStatementStats.withProblem}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Teams without Problem:</span>
                      <span className="font-bold">{problemStatementStats.withoutProblem}</span>
                    </div>
                  </div>
                )}
              </div>

              
              <div className="flex-1 flex flex-col p-4 bg-muted/50 rounded-md">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowSubmissionBreakdown(!showSubmissionBreakdown)}
                >
                  <h3 className="font-medium text-lg">Submissions:</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{submissionStats.submitted}</span>
                    {showSubmissionBreakdown ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>
                {showSubmissionBreakdown && (
                  <div className="mt-4 space-y-2 pl-4 border-l-2 border-gray-300">
                    <div className="flex justify-between items-center text-sm">
                      <span>Teams Submitted:</span>
                      <span className="font-bold">{submissionStats.submitted}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Teams Not Submitted:</span>
                      <span className="font-bold">{submissionStats.notSubmitted}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-md">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">Finalist Teams:</h3>
              <span className="text-2xl font-bold">{finalistTeamsCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="problem-filter" className="whitespace-nowrap">Problem:</Label>
            <select
              id="problem-filter"
              value={problemFilter}
              onChange={(e) => setProblemFilter(e.target.value)}
              className="p-2 border rounded-md w-48 max-w-48"
            >
              <option value="all">All Problems</option>
              {problems.map(problem => (
                <option key={problem.id} value={problem.id}>{problem.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="team-search" className="whitespace-nowrap">Search:</Label>
            <Input
              id="team-search"
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button onClick={handleOpenFinalistModal} className="whitespace-nowrap">
            <Trophy className="mr-2 h-4 w-4" /> Set Finalists
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Team
              </Button>
            </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] bg-white shadow-md rounded-lg">
            <DialogHeader>
              <DialogTitle>{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the team.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="teamName" className="text-right">Team Name</Label>
                <Input id="teamName" value={formState.teamName} onChange={(e) => setFormState({ ...formState, teamName: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="leaderEmail" className="text-right">Leader Email</Label>
                <Input id="leaderEmail" value={formState.leaderEmail} onChange={(e) => setFormState({ ...formState, leaderEmail: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="problemId" className="text-right">Problem</Label>
                <select id="problemId" value={formState.problemId} onChange={(e) => setFormState({ ...formState, problemId: e.target.value })} className="col-span-3 p-2 border rounded-md">
                  <option value="">Select Problem</option>
                  {problems.map(problem => (
                    <option key={problem.id} value={problem.id} disabled={!problem.isAvailable}>
                      {problem.title} ({problem.currentSlots}/{problem.maxSlots})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hasSubmitted" className="text-right">Submitted</Label>
                <input type="checkbox" id="hasSubmitted" checked={formState.hasSubmitted} onChange={(e) => setFormState({ ...formState, hasSubmitted: e.target.checked })} className="col-span-3 h-4 w-4" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isFinalist" className="text-right">Finalist</Label>
                <input type="checkbox" id="isFinalist" checked={formState.isFinalist} onChange={(e) => setFormState({ ...formState, isFinalist: e.target.checked })} className="col-span-3 h-4 w-4" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddEditTeam} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingTeam ? 'Save Changes' : 'Add Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Teams</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTeams.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No teams match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('name')}
                        className="h-auto p-0 font-semibold"
                      >
                        Team Name
                        {sortBy === 'name' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('leader_email')}
                        className="h-auto p-0 font-semibold"
                      >
                        Leader Email
                        {sortBy === 'leader_email' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('problem_title')}
                        className="h-auto p-0 font-semibold"
                      >
                        Problem
                        {sortBy === 'problem_title' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('has_submitted')}
                        className="h-auto p-0 font-semibold"
                      >
                        Submitted
                        {sortBy === 'has_submitted' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('is_finalist')}
                        className="h-auto p-0 font-semibold"
                      >
                        Finalist
                        {sortBy === 'is_finalist' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{team.leader_email}</TableCell>
                      <TableCell>{team.problem_title || 'N/A'}</TableCell>
                      <TableCell>{team.has_submitted ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {team.is_finalist ? 'Yes' : 'No'}
                          {team.is_finalist && <Trophy className="h-4 w-4 text-yellow-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(team)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteTeam(team.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isFinalistModalOpen} onOpenChange={setIsFinalistModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white shadow-md rounded-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Finalists</DialogTitle>
            <DialogDescription>
              Select the teams that will proceed to the final judging round.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4 space-y-3">
            <div>
              <Label htmlFor="finalist-search" className="text-sm font-medium mb-2 block">
                Search Teams
              </Label>
              <Input
                id="finalist-search"
                placeholder="Search by team name, email, problem, or track..."
                value={finalistSearchTerm}
                onChange={(e) => setFinalistSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex gap-2 text-sm">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTeams(filteredFinalistTeams.map(t => t.id))}
                className="text-xs"
              >
                Select All Filtered
              </Button>
              <Button
                variant="outline" 
                size="sm"
                onClick={() => setSelectedTeams([])}
                className="text-xs"
              >
                Clear All
              </Button>
              <span className="flex items-center text-muted-foreground">
                {selectedTeams.length} of {teams.length} selected
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filteredFinalistTeams.length > 0 ? (
              filteredFinalistTeams.map(team => (
                <div key={team.id} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    id={`team-${team.id}`}
                    checked={selectedTeams.includes(team.id)}
                    onInput={() => handleSelectTeam(team.id)}
                    className="h-4 w-4 text-primary"
                  />
                  <Label htmlFor={`team-${team.id}`} className="flex-1 font-normal">
                    {team.name}
                    <span className="ml-2 text-muted-foreground text-sm">({team.problem_title || 'No problem assigned'})</span>
                  </Label>
                </div>
              ))
            ) : finalistSearchTerm.trim() ? (
              <p className="text-center text-muted-foreground">No teams match your search criteria.</p>
            ) : (
              <p className="text-center text-muted-foreground">No teams available to set as finalists.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinalistModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetFinalists} disabled={isSettingFinalists}>
              {isSettingFinalists ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Set Finalists
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageTeamsPage;