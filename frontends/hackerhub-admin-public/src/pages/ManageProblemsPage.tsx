import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentHackathon } from '@/contexts/CurrentHackathonContext';
import NoHackathonSelected from '@/components/NoHackathonSelected';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import axios, { isAxiosError } from 'axios';

interface Problem {
  id: string;
  title: string;
  description: string;
  tag: string;
  max_slots: number;
  trackTitle: string;
  trackId: string;
}

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;

// Hidden agenda track id used for all agenda items (track concept removed from UI).
const AGENDA_TRACK_ID = '72101be3-6921-11f0-b168-0efd9d2909e1';
// Tag value of the hidden system problem that must never appear in the admin agenda list.
const SYSTEM_TAG = '__SYSTEM__';
// Tag value of the judging rubric criteria rows, managed on the dedicated Rubric page.
const RUBRIC_TAG = '__RUBRIC__';

interface DescriptionCellProps {
  description: string;
  maxLength?: number;
}

const DescriptionCell: React.FC<DescriptionCellProps> = ({ description, maxLength = 100 }) => {
  const [showModal, setShowModal] = useState(false);

  const shouldTruncate = description.length > maxLength;

  return (
    <>
      <div className="whitespace-pre-line text-sm leading-relaxed">
        {shouldTruncate ? (
          <div className="flex items-start gap-1">
            <span className="flex-1">
              {description.substring(0, maxLength)}...
            </span>
            <button
              onClick={() => setShowModal(true)}
              className="text-primary hover:text-primary/80 p-1 hover:bg-primary/10 rounded transition-colors focus:outline-none flex-shrink-0"
              title="View full description"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        ) : (
          description
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px] bg-white shadow-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Agenda Item Details</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="whitespace-pre-line text-sm leading-relaxed max-h-96 overflow-y-auto">
              {description}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ManageProblemsPage: React.FC = () => {
  const { idToken } = useAuth();
  const { currentHackathonId } = useCurrentHackathon();
  const { toast } = useToast();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    tag: '',
    max_slots: 0,
    track_id: AGENDA_TRACK_ID,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sortBy, setSortBy] = useState<'title' | null>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  
  const sortedProblems = useMemo(() => {
    if (!sortBy) return problems;
    
    return [...problems].sort((a, b) => {
      if (sortBy === 'title') {
        const comparison = a.title.localeCompare(b.title);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  }, [problems, sortBy, sortOrder]);

  const handleSort = () => {
    if (sortBy === 'title') {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy('title');
      setSortOrder('asc');
    }
  };

  
  
  const fetchProblemsAndTracks = useCallback(async () => {
    if (!idToken || !currentHackathonId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      
      const response = await axios.get(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/problems`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      
      const apiProblems = response.data.problems;

    if (!Array.isArray(apiProblems)) {
      console.error("API response for problems is not an array:", apiProblems);
      throw new Error("Invalid data format for problems received from API.");
    }


      // Exclude the hidden system problem and rubric criteria so they never
      // appear in the agenda list (rubric rows are managed on the Rubric page).
      const transformedProblems: Problem[] = apiProblems
        .filter((p: Problem) => p.tag !== SYSTEM_TAG && p.tag !== RUBRIC_TAG)
        .map((p: Problem) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          tag: p.tag,
          max_slots: p.max_slots,
          trackTitle: p.trackTitle,
          trackId: p.trackId,
        }));

      setProblems(transformedProblems);
    } catch (err: unknown) {
      console.error("Error fetching problems and tracks:", err);
      if (isAxiosError(err)) {
        const errorMessage = err.message.includes("Invalid data format")
                           ? "API returned unexpected data format. Check Lambda response and API Gateway mapping."
                           : err.message || "Failed to fetch problems and tracks.";
        setError(errorMessage);
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        setError("Failed to fetch problems and tracks.");
        toast({ title: "Error", description: "Failed to fetch problems and tracks.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [idToken, currentHackathonId, toast]);

  const handleAddEditProblem = async () => {
    setIsSubmitting(true);
    try {
      const method = editingProblem ? 'PUT' : 'POST';
      const url = editingProblem ? `${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/problems/${editingProblem.id}` : `${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/problems`;

      
      // Track concept removed from UI: agenda items always use the hidden
      // agenda track id and a zero slot count, but the backend still requires
      // these fields in the payload.
      const payload = {
        problem_title: formState.title,
        problem_description: formState.description,
        problem_tag: formState.tag,
        problem_max_slots: 0,
        track_id: AGENDA_TRACK_ID,
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

  toast({ title: "Success", description: `Problem ${editingProblem ? 'updated' : 'added'} successfully!`, variant: "default" });
  setIsDialogOpen(false);
  setEditingProblem(null);
  setFormState({ title: '', description: '', tag: '', max_slots: 0, track_id: AGENDA_TRACK_ID });
  fetchProblemsAndTracks();
    } catch (err: unknown) {
      console.error("Error saving problem:", err);
      if (isAxiosError(err) && err.response) {
        const errorMessage = err.response.data?.message || "Failed to save problem.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else if (err instanceof Error) {
        const errorMessage = err.message || "Failed to save problem.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to save problem.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
    if (!window.confirm("Are you sure you want to delete this problem?")) {
      return;
    }
    setLoading(true);
    try {
      await axios.delete(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/problems/${problemId}`, {
        headers: { 'Authorization': `Bearer ${idToken}`, },
      });
  toast({ title: "Success", description: "Problem deleted successfully!", variant: "default" });
  fetchProblemsAndTracks();
    } catch (err: unknown) {
      console.error("Error deleting problem:", err);
      if (isAxiosError(err) && err.response) {
        const errorMessage = err.response.data?.message || "Failed to delete problem.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else if (err instanceof Error) {
        const errorMessage = err.message || "Failed to delete problem.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to delete problem.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (problemToEdit: Problem | null = null) => {
    setEditingProblem(problemToEdit);
    setFormState({
      title: problemToEdit?.title || '',
      description: problemToEdit?.description || '',
      tag: problemToEdit?.tag || '',
      max_slots: problemToEdit?.max_slots || 0,
      track_id: problemToEdit?.trackId || AGENDA_TRACK_ID,
    });
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (idToken && currentHackathonId) {
      fetchProblemsAndTracks();
    }
  }, [idToken, currentHackathonId, fetchProblemsAndTracks]);
  
  const totalProblems = useMemo(() => {
    return problems.length;
  }, [problems]);

  if (!currentHackathonId) {
    return <NoHackathonSelected />;
  }

  if (loading) {
    return (
      <div className="aws-container py-8 flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading agenda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aws-container py-8 text-center text-red-600">
        <p className="text-xl font-bold mb-4">Error Loading Agenda</p>
        <p>{error}</p>
        <Button onClick={fetchProblemsAndTracks} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="aws-container py-8">
      <h1 className="text-3xl font-bold mb-6">Manage Agenda</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Agenda Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center justify-between p-4 bg-muted/50 rounded-md">
            <h3 className="font-medium">Total Agenda Items:</h3>
            <span className="text-2xl font-bold">{totalProblems}</span>
          </div>
        </CardContent>
      </Card>
      

      <div className="flex justify-end mb-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Agenda Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] bg-white shadow-md rounded-lg">
            <DialogHeader>
              <DialogTitle>{editingProblem ? 'Edit Agenda Item' : 'Add Agenda Item'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the agenda item.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input id="title" value={formState.title} onChange={(e) => setFormState({ ...formState, title: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                  Details
                </Label>
                <Textarea
                  id="description"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="col-span-3 min-h-[100px]"
                  placeholder="Enter details for this agenda item..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tag" className="text-right">
                  Time / Slot
                </Label>
                <Input id="tag" value={formState.tag} onChange={(e) => setFormState({ ...formState, tag: e.target.value })} className="col-span-3" placeholder="e.g. Day 1 · 09:00" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddEditProblem} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingProblem ? 'Save Changes' : 'Add Agenda Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Agenda</CardTitle>
        </CardHeader>
        <CardContent>
          {problems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No agenda items yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/5">
                      <Button
                        variant="ghost"
                        onClick={handleSort}
                        className="h-auto p-0 font-semibold hover:bg-transparent flex items-center gap-1"
                      >
                        Title
                        {sortBy === 'title' ? (
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
                    <TableHead className="w-2/5">Details</TableHead>
                    <TableHead>Time / Slot</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProblems.map((problem) => (
                    <TableRow key={problem.id}>
                      <TableCell className="font-medium w-1/5 break-words">
                        <div className="whitespace-normal">
                          {problem.title}
                        </div>
                      </TableCell>
                      <TableCell className="w-2/5">
                        <DescriptionCell description={problem.description} maxLength={150} />
                      </TableCell>
                      <TableCell>{problem.tag}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(problem)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteProblem(problem.id)}>
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
    </div>
  );
};

export default ManageProblemsPage;