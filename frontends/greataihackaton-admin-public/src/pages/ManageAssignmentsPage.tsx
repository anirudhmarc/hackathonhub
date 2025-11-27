import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import axios, { isAxiosError } from 'axios';

interface Assignment {
  id: string;
  judgeId: string;
  judgeName: string;
  judgeEmail: string;
  teamId: string;
  teamName: string;
  assignedAt: string;
  stageId: string;
  stageName: string;
}

interface Judge {
  judge_id: string;
  judge_name: string;
  email_address: string;
}

interface Team {
  id: string;
  name: string;
  leader_email?: string;
  is_finalist?: boolean;
  track_name?: string;
  problem_id?: string;
  problem_title?: string;
  problem_description?: string;
  track_id?: string;
  track?: 'student' | 'corporate';
  has_submitted?: boolean;
}

interface JudgingStage {
  stage_id: string;
  stage_name: string;
}

interface Problem {
  id: string;
  title: string;
}

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;

interface TeamItemProps {
  team: Team;
  isSelected: boolean;
  isAlreadyAssigned: boolean;
  onToggle: (teamId: string) => void;
}

const TeamItem = memo(({ team, isSelected, isAlreadyAssigned, onToggle }: TeamItemProps) => {
  const handleChange = useCallback(() => {
    onToggle(team.id);
  }, [team.id, onToggle]);

  const hasSubmission = team.has_submitted === true;

  return (
    <div className={`flex items-center space-x-3 p-3 hover:bg-white rounded-md border transition-colors ${
      isAlreadyAssigned ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
    }`}>
      <input
        type="checkbox"
        id={`team-${team.id}`}
        checked={isSelected}
        onChange={handleChange}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <label 
          htmlFor={`team-${team.id}`} 
          className="text-sm font-medium text-gray-900 leading-none cursor-pointer block"
        >
          {team.name}
          {isAlreadyAssigned && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Already Assigned
            </span>
          )}
          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
            hasSubmission 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {hasSubmission ? 'Submitted' : 'No Submission'}
          </span>
        </label>
        <div className="text-xs text-gray-600 mt-1">
          Problem: {team.problem_title || 'Not selected'}
        </div>
      </div>
    </div>
  );
});

TeamItem.displayName = 'TeamItem';

const ManageAssignmentsPage = memo(() => {
  const { idToken } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [judgingStages, setJudgingStages] = useState<JudgingStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [formState, setFormState] = useState({
    judgeId: '',
    teamId: '',
    stageId: '',
  });
  const [bulkFormState, setBulkFormState] = useState({
    judgeIds: [] as string[],
    stageId: '',
    teamIds: [] as string[],
  });
  const [bulkFilters, setBulkFilters] = useState({
    problemFilter: 'all',
    searchQuery: '',
    submissionFilter: 'submitted',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [stageFilter, setStageFilter] = useState('all');
  const [judgeFilter, setJudgeFilter] = useState('all');
  const [problemFilter, setProblemFilter] = useState('all');

  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const [sortBy, setSortBy] = useState<'assignedAt' | null>('assignedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [finalRoundStageId, setFinalRoundStageId] = useState<string | null>(null);

  useEffect(() => {
    if (judgingStages.length > 0 && !formState.stageId) {
      const preliminaryStage = judgingStages.find(stage => stage.stage_name === 'Preliminary Round');
      if (preliminaryStage) {
        setFormState(prev => ({ ...prev, stageId: preliminaryStage.stage_id }));
        setBulkFormState(prev => ({ ...prev, stageId: preliminaryStage.stage_id }));
      } else {
        setFormState(prev => ({ ...prev, stageId: judgingStages[0].stage_id }));
        setBulkFormState(prev => ({ ...prev, stageId: judgingStages[0].stage_id }));
      }
    }
  }, [judgingStages, formState.stageId]);

  const fetchData = useCallback(async () => {
    if (!idToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [assignmentsRes, judgesRes, teamsRes, stagesRes] = await Promise.all([
        axios.get(`${API_GATEWAY_BASE_URL}/admin/assignments`, { headers: { 'Authorization': `Bearer ${idToken}` } }),
        axios.get(`${API_GATEWAY_BASE_URL}/admin/judges`, { headers: { 'Authorization': `Bearer ${idToken}` } }),
        axios.get(`${API_GATEWAY_BASE_URL}/admin/teams`, { headers: { 'Authorization': `Bearer ${idToken}` } }),
        axios.get(`${API_GATEWAY_BASE_URL}/admin/judging-stages`, { headers: { 'Authorization': `Bearer ${idToken}` } }),
      ]);
      setAssignments(assignmentsRes.data);
      setJudges(judgesRes.data);
      
      const teamsData = teamsRes.data?.teams || [];
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setJudgingStages(stagesRes.data);
      const problemsData = teamsRes.data?.problems || [];
      if (Array.isArray(problemsData) && problemsData.length > 0) {
        setProblems(problemsData);
      } else {
        const map = new Map<string, { id: string; title: string }>();
        (teamsData || []).forEach((t: any) => {
          if (t.problem_id) {
            const id = t.problem_id;
            const title = t.problem_title || t.problem_description || id;
            if (!map.has(id)) map.set(id, { id, title });
          }
        });
        setProblems(Array.from(map.values()));
      }

      const finalStage = stagesRes.data.find((stage: JudgingStage) => stage.stage_name === 'Final Round');
      if (finalStage) setFinalRoundStageId(finalStage.stage_id);

    } catch (err: unknown) {
      console.error("Error fetching data:", err);
      let errorMessage = "Failed to fetch data.";
      if (isAxiosError(err)) {
        errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [idToken, toast]);

  const handleAddAssignment = async () => {
    setIsSubmitting(true);
    try {
      await axios.post(`${API_GATEWAY_BASE_URL}/admin/assignments`, formState, {
        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      });
      toast({ title: "Success", description: "Assignment added successfully!", variant: "default" });
      setIsDialogOpen(false);
      setFormState({ judgeId: '', teamId: '', stageId: judgingStages[0]?.stage_id || '' });
      fetchData();
    } catch (err: unknown) {
      console.error("Error adding assignment:", err);
      let errorMessage = "Failed to add assignment.";
      if (isAxiosError(err) && err.response) {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAssignment = async () => {
    if (bulkFormState.teamIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one team", variant: "destructive" });
      return;
    }
    
    if (bulkFormState.judgeIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one judge", variant: "destructive" });
      return;
    }
    
  const teamsToAssign = bulkFormState.teamIds.filter(teamId => !isTeamAlreadyAssigned(teamId));
    
    if (teamsToAssign.length === 0) {
      toast({ 
        title: "Info", 
        description: "All selected teams are already assigned to the selected judges for this stage", 
        variant: "default" 
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const assignmentPromises: Promise<any>[] = [];
      
      bulkFormState.judgeIds.forEach(judgeId => {
        teamsToAssign.forEach(teamId => {
          assignmentPromises.push(
            axios.post(`${API_GATEWAY_BASE_URL}/admin/assignments`, {
              judgeId: judgeId,
              teamId: teamId,
              stageId: bulkFormState.stageId,
            }, {
              headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
            })
          );
        });
      });
      
      await Promise.all(assignmentPromises);
      
  const skippedCount = bulkFormState.teamIds.length - teamsToAssign.length;
      const totalAssignments = bulkFormState.judgeIds.length * teamsToAssign.length;
      let message = `Successfully created ${totalAssignments} assignments (${teamsToAssign.length} teams × ${bulkFormState.judgeIds.length} judges)!`;
      if (skippedCount > 0) {
        message += ` (${skippedCount} teams were already assigned and skipped)`;
      }
      
      toast({ 
        title: "Success", 
        description: message, 
        variant: "default" 
      });
      setIsBulkDialogOpen(false);
      setBulkFormState({ judgeIds: [], stageId: judgingStages[0]?.stage_id || '', teamIds: [] });
      fetchData();
    } catch (err: unknown) {
      console.error("Error adding bulk assignments:", err);
      let errorMessage = "Failed to add bulk assignments.";
      if (isAxiosError(err) && err.response) {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }
    setLoading(true);
    try {
      await axios.delete(`${API_GATEWAY_BASE_URL}/admin/assignments/${assignmentId}`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      toast({ title: "Success", description: "Assignment deleted successfully!", variant: "default" });
      fetchData();
    } catch (err: unknown) {
      console.error("Error deleting assignment:", err);
      let errorMessage = "Failed to delete assignment.";
      if (isAxiosError(err) && err.response) {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssignments.length === 0) {
      toast({ title: "Error", description: "Please select at least one assignment to delete", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
        const deletePromises = selectedAssignments.map(assignmentId => 
        axios.delete(`${API_GATEWAY_BASE_URL}/admin/assignments/${assignmentId}`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
        })
      );
      
      await Promise.all(deletePromises);
      
      toast({ 
        title: "Success", 
        description: `Successfully deleted ${selectedAssignments.length} assignment(s)!`, 
        variant: "default" 
      });
      
      setSelectedAssignments([]);
      setIsBulkDeleteDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      console.error("Error deleting assignments:", err);
      let errorMessage = "Failed to delete assignments.";
      if (isAxiosError(err) && err.response) {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignmentToggle = useCallback((assignmentId: string) => {
    setSelectedAssignments(prev => 
      prev.includes(assignmentId)
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  }, []);

  useEffect(() => { if (idToken) fetchData(); }, [idToken, fetchData]);

  const filteredAssignments = useMemo(() => {
    let result = assignments;

    if (stageFilter !== 'all') {
      result = result.filter(assignment => assignment.stageId === stageFilter);
    }

    if (judgeFilter !== 'all') {
      result = result.filter(assignment => assignment.judgeId === judgeFilter);
    }

    
    if (problemFilter !== 'all' && teams && Array.isArray(teams)) {
      result = result.filter(assignment => {
        const team = teams.find(t => t.id === assignment.teamId);
        return team ? team.problem_id === problemFilter : false;
      });
    }

    if (sortBy === 'assignedAt') {
      result = [...result].sort((a, b) => {
        const dateA = new Date(a.assignedAt).getTime();
        const dateB = new Date(b.assignedAt).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return result;
  }, [assignments, stageFilter, judgeFilter, problemFilter, teams, sortBy, sortOrder]);

  const handleSelectAllAssignments = useCallback(() => {
    const allAssignmentIds = filteredAssignments.map(assignment => assignment.id);
    setSelectedAssignments(prev => 
      prev.length === allAssignmentIds.length ? [] : allAssignmentIds
    );
  }, [filteredAssignments]);

  const handleSort = () => {
    if (sortBy === 'assignedAt') {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy('assignedAt');
      setSortOrder('desc');
    }
  };
  
  const teamsToShow = useMemo(() => {
    if (!teams || !Array.isArray(teams)) return [];
    if (formState.stageId === finalRoundStageId) {
        return teams.filter(team => team.is_finalist);
    }
    return teams;
  }, [formState.stageId, finalRoundStageId, teams]);

  const bulkTeamsToShow = useMemo(() => {
    if (!teams || !Array.isArray(teams)) return [];
    
    let filteredTeams = teams;
    
    if (bulkFormState.stageId === finalRoundStageId) {
      filteredTeams = filteredTeams.filter(team => team.is_finalist);
    }
    if (bulkFilters.problemFilter !== 'all') {
      filteredTeams = filteredTeams.filter(team => team.problem_id === bulkFilters.problemFilter);
    }
    if (bulkFilters.submissionFilter !== 'all') {
      filteredTeams = filteredTeams.filter(team => {
        const hasSubmission = team.has_submitted === true;
        if (bulkFilters.submissionFilter === 'submitted') {
          return hasSubmission;
        } else if (bulkFilters.submissionFilter === 'not-submitted') {
          return !hasSubmission;
        }
        return true;
      });
    }
    if (bulkFilters.searchQuery.trim() !== '') {
      filteredTeams = filteredTeams.filter(team => 
        team.name && team.name.toLowerCase().includes(bulkFilters.searchQuery.toLowerCase())
      );
    }
    filteredTeams = [...filteredTeams].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    return filteredTeams;
  }, [bulkFormState.stageId, finalRoundStageId, teams, bulkFilters]);

  const handleTeamToggle = (teamId: string) => {
    setBulkFormState(prev => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter(id => id !== teamId)
        : [...prev.teamIds, teamId]
    }));
  };

  const isTeamAlreadyAssigned = useCallback((teamId: string) => {
    if (bulkFormState.judgeIds.length === 0 || !bulkFormState.stageId) return false;
    return assignments.some(assignment => 
      assignment.teamId === teamId && 
      bulkFormState.judgeIds.includes(assignment.judgeId) && 
      assignment.stageId === bulkFormState.stageId
    );
  }, [assignments, bulkFormState.judgeIds, bulkFormState.stageId]);

  const alreadyAssignedTeamIds = useMemo(() => {
    if (bulkFormState.judgeIds.length === 0 || !bulkFormState.stageId) return [];
    return assignments
      .filter(assignment => 
        bulkFormState.judgeIds.includes(assignment.judgeId) && 
        assignment.stageId === bulkFormState.stageId
      )
      .map(assignment => assignment.teamId);
  }, [assignments, bulkFormState.judgeIds, bulkFormState.stageId]);

  const handleSelectAllTeams = () => {
    const allTeamIds = bulkTeamsToShow.map(team => team.id);
    const newSelectedIds = bulkFormState.teamIds.length === allTeamIds.length ? [] : allTeamIds;
    setBulkFormState(prev => ({
      ...prev,
      teamIds: newSelectedIds
    }));
  };

  useEffect(() => {
    setBulkFormState(prev => ({ 
      ...prev, 
      teamIds: [...alreadyAssignedTeamIds]
    }));
  }, [bulkFilters, alreadyAssignedTeamIds]);

  useEffect(() => {
    setBulkFormState(prev => ({ 
      ...prev, 
      teamIds: [...alreadyAssignedTeamIds]
    }));
  }, [bulkFormState.judgeIds, bulkFormState.stageId, alreadyAssignedTeamIds]);

  if (loading) {
    return (
      <div className="aws-container py-8 flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading assignments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aws-container py-8 text-center text-red-600">
        <p className="text-xl font-bold mb-4">Error Loading Assignments</p>
        <p>{error}</p>
        <Button onClick={fetchData} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="aws-container py-8">
      <h1 className="text-3xl font-bold mb-6">Manage Judge Assignments</h1>
      <div className="flex justify-between items-center mb-4">
        
        <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="stage-filter">Filter by Stage:</Label>
        <select
        id="stage-filter"
        value={stageFilter}
        onChange={(e) => setStageFilter(e.target.value)}
        className="w-[180px] p-2 border rounded-md bg-white"
        >
        <option value="all">All Stages</option>
        {judgingStages.map(stage => (
          <option key={stage.stage_id} value={stage.stage_id}>{stage.stage_name}</option>
        ))}
        </select>
      </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="judge-filter">Filter by Judge:</Label>
            <select
              id="judge-filter"
              value={judgeFilter}
              onChange={(e) => setJudgeFilter(e.target.value)}
              className="w-[180px] p-2 border rounded-md bg-white"
            >
              <option value="all">All Judges</option>
              {judges.map(judge => (
                <option key={judge.judge_id} value={judge.judge_id}>{judge.judge_name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="problem-filter-top">Filter by Problem:</Label>
            <select
              id="problem-filter-top"
              value={problemFilter}
              onChange={(e) => setProblemFilter(e.target.value)}
              className="w-[220px] p-2 border rounded-md bg-white"
            >
              <option value="all">All Problems</option>
              {problems && Array.isArray(problems) && problems.map(problem => (
                <option key={problem.id} value={problem.id}>{problem.title}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setFormState({ judgeId: '', teamId: '', stageId: judgingStages[0]?.stage_id || '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Single Assignment
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] bg-white shadow-md rounded-lg">
            <DialogHeader>
              <DialogTitle>Add New Assignment</DialogTitle>
              <DialogDescription>
                Assign a team to a judge for a specific judging stage.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="judgeId" className="text-right">
                  Judge
                </Label>
                <select
                  id="judgeId"
                  value={formState.judgeId}
                  onChange={(e) => setFormState({ ...formState, judgeId: e.target.value })}
                  className="col-span-3 p-2 border rounded-md bg-white"
                >
                  <option value="">Select Judge</option>
                  {judges.map(judge => (
                    <option key={judge.judge_id} value={judge.judge_id}>{judge.judge_name} ({judge.email_address})</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stageId" className="text-right">
                  Stage
                </Label>
                <select
                  id="stageId"
                  value={formState.stageId}
                  onChange={(e) => setFormState(prev => ({ ...prev, stageId: e.target.value }))}
                  className="col-span-3 p-2 border rounded-md bg-white"
                >
                  {judgingStages.map(stage => (
                    <option key={stage.stage_id} value={stage.stage_id}>{stage.stage_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="teamId" className="text-right">
                  Team
                </Label>
                <select
                  id="teamId"
                  value={formState.teamId}
                  onChange={(e) => setFormState({ ...formState, teamId: e.target.value })}
                  className="col-span-3 p-2 border rounded-md bg-white"
                >
                  <option value="">Select Team</option>
                  {teamsToShow.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddAssignment} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              onClick={() => {
                setBulkFormState({ judgeIds: [], stageId: judgingStages[0]?.stage_id || '', teamIds: [] });
                setBulkFilters({ problemFilter: 'all', searchQuery: '', submissionFilter: 'submitted' });
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Bulk Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] bg-white shadow-md rounded-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bulk Assignment</DialogTitle>
              <DialogDescription>
                Assign multiple teams to a judge for a specific judging stage at once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-judgeId" className="text-sm font-medium">
                    Judges (Select Multiple)
                  </Label>
                  <div className="border rounded-lg p-3 bg-gray-50 max-h-32 overflow-y-auto">
                    <div className="space-y-2">
                      {judges.map(judge => (
                        <div key={judge.judge_id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`judge-${judge.judge_id}`}
                            checked={bulkFormState.judgeIds.includes(judge.judge_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkFormState(prev => ({
                                  ...prev,
                                  judgeIds: [...prev.judgeIds, judge.judge_id]
                                }));
                              } else {
                                setBulkFormState(prev => ({
                                  ...prev,
                                  judgeIds: prev.judgeIds.filter(id => id !== judge.judge_id)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label 
                            htmlFor={`judge-${judge.judge_id}`}
                            className="text-sm font-medium text-gray-900 cursor-pointer flex-1"
                          >
                            {judge.judge_name} ({judge.email_address})
                          </label>
                        </div>
                      ))}
                    </div>
                    {bulkFormState.judgeIds.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No judges selected
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Selected: <span className="font-medium">{bulkFormState.judgeIds.length} judge(s)</span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (bulkFormState.judgeIds.length === judges.length) {
                          setBulkFormState(prev => ({ ...prev, judgeIds: [] }));
                        } else {
                          setBulkFormState(prev => ({ ...prev, judgeIds: judges.map(j => j.judge_id) }));
                        }
                      }}
                      className="text-xs"
                    >
                      {bulkFormState.judgeIds.length === judges.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bulk-stageId" className="text-sm font-medium">
                    Stage
                  </Label>
                  <select
                    id="bulk-stageId"
                    value={bulkFormState.stageId}
                    onChange={(e) => setBulkFormState(prev => ({ ...prev, stageId: e.target.value }))}
                    className="w-full p-2 border rounded-md bg-white"
                  >
                    {judgingStages.map(stage => (
                      <option key={stage.stage_id} value={stage.stage_id}>{stage.stage_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              
              <div className="border-t pt-6">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Filter Teams</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="problem-filter" className="text-sm font-medium text-gray-700">
                        Problem Statement
                      </Label>
                        <select
                          value={bulkFilters.problemFilter}
                          onChange={(e) => setBulkFilters(prev => ({ ...prev, problemFilter: e.target.value }))}
                          className="w-full p-2 border rounded-md bg-white"
                        >
                          <option value="all">All Problems</option>
                          {problems && Array.isArray(problems) && problems.map(problem => (
                            <option key={problem.id} value={problem.id}>{problem.title}</option>
                          ))}
                        </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="submission-filter" className="text-sm font-medium text-gray-700">
                        Submission Status
                      </Label>
                      <select
                        value={bulkFilters.submissionFilter}
                        onChange={(e) => setBulkFilters(prev => ({ ...prev, submissionFilter: e.target.value }))}
                        className="w-full p-2 border rounded-md bg-white"
                      >
                        <option value="all">All Teams</option>
                        <option value="submitted">Teams with Submission</option>
                        <option value="not-submitted">Teams without Submission</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="search-teams" className="text-sm font-medium text-gray-700">
                        Search Team Name
                      </Label>
                      <Input
                        id="search-teams"
                        type="text"
                        placeholder="Type team name..."
                        value={bulkFilters.searchQuery}
                        onChange={(e) => setBulkFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Select Teams</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      Showing {bulkTeamsToShow.length} team(s)
                    </span>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleSelectAllTeams}
                      disabled={bulkTeamsToShow.length === 0}
                      className="text-xs"
                    >
                      {bulkFormState.teamIds.length === bulkTeamsToShow.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
                  {bulkTeamsToShow.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No teams found matching the current filters
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {bulkTeamsToShow.map(team => {
                        const isAlreadyAssigned = isTeamAlreadyAssigned(team.id);
                        const isSelected = bulkFormState.teamIds.includes(team.id);
                        
                        return (
                          <TeamItem
                            key={team.id}
                            team={team}
                            isSelected={isSelected}
                            isAlreadyAssigned={isAlreadyAssigned}
                            onToggle={handleTeamToggle}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Selected: <span className="font-medium text-gray-900">{bulkFormState.teamIds.length} team(s)</span>
                    </p>
                    {alreadyAssignedTeamIds.length > 0 && (
                      <p className="text-xs text-blue-600">
                        {alreadyAssignedTeamIds.length} team(s) already assigned to selected judges for this stage
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="bg-gray-50 px-6 py-4">
              <Button 
                type="submit" 
                onClick={handleBulkAssignment} 
                disabled={isSubmitting || bulkFormState.teamIds.length === 0 || bulkFormState.judgeIds.length === 0}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {(() => {
                  const newAssignments = bulkFormState.teamIds.filter(teamId => !isTeamAlreadyAssigned(teamId)).length;
                  const totalSelected = bulkFormState.teamIds.length;
                  const judgeCount = bulkFormState.judgeIds.length;
                  const totalAssignments = newAssignments * judgeCount;
                  
                  if (judgeCount === 0) {
                    return "Select Judges First";
                  } else if (newAssignments === 0 && totalSelected > 0) {
                    return `All ${totalSelected} Team(s) Already Assigned`;
                  } else if (newAssignments < totalSelected) {
                    return `Create ${totalAssignments} Assignments (${newAssignments} teams × ${judgeCount} judges)`;
                  } else {
                    return `Create ${totalAssignments} Assignments (${totalSelected} teams × ${judgeCount} judges)`;
                  }
                })()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Current Assignments ({filteredAssignments.length})</CardTitle>
          {filteredAssignments.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedAssignments.length === filteredAssignments.length && filteredAssignments.length > 0}
                  onChange={handleSelectAllAssignments}
                  className="rounded"
                />
                Select All
              </label>
              {selectedAssignments.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedAssignments.length})
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No assignments found for this stage.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedAssignments.length === filteredAssignments.length && filteredAssignments.length > 0}
                        onChange={handleSelectAllAssignments}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Judge Name</TableHead>
                    <TableHead>Judge Email</TableHead>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Problem Statement</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={handleSort}
                        className="h-auto p-0 font-semibold hover:bg-transparent flex items-center gap-1"
                      >
                        Assigned At
                        {sortBy === 'assignedAt' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedAssignments.includes(assignment.id)}
                          onChange={() => handleAssignmentToggle(assignment.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{assignment.judgeName}</TableCell>
                      <TableCell>{assignment.judgeEmail}</TableCell>
                      <TableCell>{assignment.teamName}</TableCell>
                      <TableCell>{(teams.find(t => t.id === assignment.teamId) || { problem_title: 'Not selected' }).problem_title || 'Not selected'}</TableCell>
                      <TableCell>{assignment.stageName}</TableCell>
                      <TableCell>{new Date(assignment.assignedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteAssignment(assignment.id)} className="bg-red-600 hover:bg-red-700 text-white">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="bg-white shadow-lg border border-gray-200">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedAssignments.length} assignment(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedAssignments.length} Assignment(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

ManageAssignmentsPage.displayName = 'ManageAssignmentsPage';

export default ManageAssignmentsPage;