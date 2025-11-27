import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import JudgesSummaryChart from '@/components/JudgesSummaryChart';
import axios, { isAxiosError } from 'axios';

interface Judge {
  judge_id: string;
  judge_name: string;
  email_address: string;
}

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;

const ManageJudgesPage: React.FC = () => {
  const { idToken } = useAuth();
  const { toast } = useToast();
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [formState, setFormState] = useState({
    judgeName: '',
    emailAddress: '',
  });
  const [bulkJudges, setBulkJudges] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [judgeMap, setJudgeMap] = useState<Record<string, string>>({});

  

  const [sortBy, setSortBy] = useState<'judge_name' | null>('judge_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedJudges = useMemo(() => {
    if (!sortBy || !judges) return judges;
    
    return [...judges].sort((a, b) => {
      let aValue = '';
      let bValue = '';

      if (sortBy === 'judge_name') {
        aValue = a.judge_name.toLowerCase();
        bValue = b.judge_name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }, [judges, sortBy, sortOrder]);

  const handleSort = (column: 'judge_name') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  
  const fetchJudges = useCallback(async () => {
    if (!idToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_GATEWAY_BASE_URL}/admin/judges`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      setJudges(response.data);
    } catch (err: unknown) {
      console.error("Error fetching judges:", err);
      if (isAxiosError(err)) {
        setError(err.message || "Failed to fetch judges.");
      } else {
        setError("An unexpected error occurred.");
      }
      toast({ title: "Error", description: (isAxiosError(err) ? err.message : "An unexpected error occurred.") || "Failed to fetch judges.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [idToken, toast]);

  const handleAddEditJudge = async () => {
    setIsSubmitting(true);
    try {
      const method = editingJudge ? 'PUT' : 'POST';
      const url = editingJudge ? `${API_GATEWAY_BASE_URL}/admin/judges/${editingJudge.judge_id}` : `${API_GATEWAY_BASE_URL}/admin/judges`;

      const payload = {
        judge_name: formState.judgeName,
        email_address: formState.emailAddress,
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

      toast({ title: "Success", description: `Judge ${editingJudge ? 'updated' : 'added'} successfully!`, variant: "default" });
      setIsDialogOpen(false);
      setEditingJudge(null);
      setFormState({ judgeName: '', emailAddress: '' });
      fetchJudges();
    } catch (err: unknown) {
      console.error("Error saving judge:", err);
      if (isAxiosError(err) && err.response) {
        const errorMessage = err.response?.data?.message || err.message || "Failed to save judge.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAddJudges = async () => {
    if (!bulkJudges.trim()) {
      toast({ title: "Error", description: "Please enter judge information.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      
      const lines = bulkJudges.trim().split('\n').filter(line => line.trim());
      const judgesData: Array<{ judge_name: string; email_address: string }> = [];
      
      for (const line of lines) {
        const parts = line.split(',').map(part => part.trim());
        if (parts.length !== 2) {
          toast({ 
            title: "Error", 
            description: `Invalid format in line: "${line}". Expected format: "Name,email@example.com"`, 
            variant: "destructive" 
          });
          setIsSubmitting(false);
          return;
        }
        
        const [name, email] = parts;
        if (!name || !email) {
          toast({ 
            title: "Error", 
            description: `Missing name or email in line: "${line}"`, 
            variant: "destructive" 
          });
          setIsSubmitting(false);
          return;
        }
        
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          toast({ 
            title: "Error", 
            description: `Invalid email format: "${email}"`, 
            variant: "destructive" 
          });
          setIsSubmitting(false);
          return;
        }
        
        judgesData.push({
          judge_name: name,
          email_address: email,
        });
      }

      
      const promises = judgesData.map(judgeData => 
        axios.post(`${API_GATEWAY_BASE_URL}/admin/judges`, judgeData, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      const results = await Promise.allSettled(promises);
      
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      if (successful > 0) {
        toast({ 
          title: "Success", 
          description: `${successful} judge(s) added successfully!${failed > 0 ? ` ${failed} failed.` : ''}`, 
          variant: "default" 
        });
      }
      
      if (failed > 0) {
        const failedResults = results
          .map((result, index) => ({ result, index }))
          .filter(({ result }) => result.status === 'rejected')
          .map(({ result, index }) => `${judgesData[index].judge_name}: ${(result as PromiseRejectedResult).reason}`)
          .join('\n');
        
        console.error("Failed judges:", failedResults);
        toast({ 
          title: "Partial Failure", 
          description: `${failed} judge(s) failed to be added. Check console for details.`, 
          variant: "destructive" 
        });
      }

      setIsBulkDialogOpen(false);
      setBulkJudges('');
      fetchJudges();
    } catch (err: unknown) {
      console.error("Error in bulk adding judges:", err);
      toast({ title: "Error", description: "An unexpected error occurred during bulk creation.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJudge = async (judgeId: string) => {
    if (!window.confirm("Are you sure you want to delete this judge?")) {
      return;
    }
    setLoading(true);
    try {
      await axios.delete(`${API_GATEWAY_BASE_URL}/admin/judges/${judgeId}`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      toast({ title: "Success", description: "Judge deleted successfully!", variant: "default" });
      fetchJudges();
    } catch (err: unknown) {
      console.error("Error deleting judge:", err);
      if (isAxiosError(err) && err.response) {
        const errorMessage = err.response?.data?.message || err.message || "Failed to delete judge.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  

  const handleOpenDialog = (judgeToEdit: Judge | null = null) => {
    setEditingJudge(judgeToEdit);
    setFormState({
      judgeName: judgeToEdit?.judge_name || '',
      emailAddress: judgeToEdit?.email_address || '',
    });
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (idToken) {
      fetchJudges();
    }
  }, [idToken, fetchJudges]);

  
  useEffect(() => {
    const fetchSummary = async () => {
      if (!idToken) return;
      try {
        const [assignmentsResp, leaderboardResp] = await Promise.all([
          axios.get(`${API_GATEWAY_BASE_URL}/admin/assignments`, { headers: { Authorization: `Bearer ${idToken}` } }),
          axios.get(`${API_GATEWAY_BASE_URL}/admin/leaderboard`, { headers: { Authorization: `Bearer ${idToken}` } }),
        ]);
        setAssignments(assignmentsResp.data || []);
        const lb = leaderboardResp.data || {};
        setScores(lb.scores || []);
        const fetchedJudges = lb.judges || [];
        const map: Record<string, string> = {};
        fetchedJudges.forEach((j: any) => { if (j.judge_id) map[j.judge_id] = j.judge_name; });
        
        judges.forEach(j => { map[j.judge_id] = j.judge_name; });
        setJudgeMap(map);
      } catch (err) {
        console.warn('Failed to fetch judges summary data', err);
      }
    };
    fetchSummary();
  }, [idToken, judges]);

  
  const perJudgeSummary = useMemo(() => {
    const judgeAssignments: Record<string, Set<string>> = {};
    assignments.forEach(a => {
      const jId = (a.judge_id || a.judge || a.judgeId || '').toString();
      const tId = (a.team_id || a.team || a.teamId || '').toString();
      if (!jId || !tId) return;
      if (!judgeAssignments[jId]) judgeAssignments[jId] = new Set();
      judgeAssignments[jId].add(tId);
    });

    const arr: { judge_id: string; judge_name: string; reviewed: number; pending: number }[] = Object.keys(judgeAssignments).map(jid => {
      const assigned = Array.from(judgeAssignments[jid]);
      const reviewed = assigned.filter(tid => scores.some(s => s.team_id === tid && s.judge_id === jid)).length;
      const pending = Math.max(0, assigned.length - reviewed);
      return {
        judge_id: jid,
        judge_name: judgeMap[jid] || `Judge ${jid}`,
        reviewed,
        pending,
      };
    });

    
    judges.forEach(j => {
      if (!arr.find(x => x.judge_id === j.judge_id)) {
        arr.push({ judge_id: j.judge_id, judge_name: j.judge_name, reviewed: 0, pending: 0 });
      }
    });

    
    arr.sort((a, b) => a.judge_name.toLowerCase().localeCompare(b.judge_name.toLowerCase()));
    return arr;
  }, [assignments, scores, judges, judgeMap]);

  const [judgeSortBy, setJudgeSortBy] = useState<'name' | 'percent'>('name');
  const sortedPerJudgeSummary = useMemo(() => {
    if (judgeSortBy === 'name') return perJudgeSummary;
    return [...perJudgeSummary].sort((a, b) => {
      const totalA = a.reviewed + a.pending;
      const totalB = b.reviewed + b.pending;
      const pctA = totalA === 0 ? 0 : a.reviewed / totalA;
      const pctB = totalB === 0 ? 0 : b.reviewed / totalB;
      if (pctA === pctB) return a.judge_name.toLowerCase().localeCompare(b.judge_name.toLowerCase());
      return pctB - pctA;
    });
  }, [perJudgeSummary, judgeSortBy]);
  
  const totalJudges = useMemo(() => {
    return judges.length;
  }, [judges]);
  
  if (loading) {
    return (
      <div className="aws-container py-8 flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading judges...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aws-container py-8 text-center text-red-600">
        <p className="text-xl font-bold mb-4">Error Loading Judges</p>
        <p>{error}</p>
        <Button onClick={fetchJudges} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="aws-container py-8">
      <h1 className="text-3xl font-bold mb-6">Manage Judges</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Judges Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1 flex items-center justify-between p-4 bg-muted/50 rounded-md">
                <h3 className="font-medium">Total Judges:</h3>
                <span className="text-2xl font-bold">{totalJudges}</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">Sort</div>
                <Select value={judgeSortBy} onValueChange={(v) => setJudgeSortBy(v as 'name' | 'percent')}>
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50 rounded-md shadow-md">
                    <SelectItem className="px-3 py-2 rounded-md data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white" value="name">Name (A → Z)</SelectItem>
                    <SelectItem className="px-3 py-2 rounded-md data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white" value="percent">Completion % (High → Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <JudgesSummaryChart data={sortedPerJudgeSummary} />
        </CardContent>
      </Card>

      <div className="flex justify-end mb-4 gap-2">
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setBulkJudges('')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Bulk Add Judges
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-white shadow-md rounded-lg">
            <DialogHeader>
              <DialogTitle>Bulk Add Judges</DialogTitle>
              <DialogDescription>
                Add multiple judges at once. Enter each judge on a new line in the format: Name,email@example.com
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bulkJudges">Judge Information</Label>
                <Textarea
                  id="bulkJudges"
                  placeholder="John Doe,john.doe@example.com&#10;Jane Smith,jane.smith@example.com&#10;Bob Johnson,bob.johnson@example.com"
                  value={bulkJudges}
                  onChange={(e) => setBulkJudges(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Format Instructions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Each judge should be on a separate line</li>
                    <li>Format: <code className="bg-muted px-1 rounded">Name,email@example.com</code></li>
                    <li>No spaces around the comma</li>
                    <li>Valid email addresses are required</li>
                  </ul>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleBulkAddJudges} disabled={isSubmitting || !bulkJudges.trim()}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Judges
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Single Judge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] bg-white shadow-md rounded-lg">
            <DialogHeader>
              <DialogTitle>{editingJudge ? 'Edit Judge' : 'Add New Judge'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the judge.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="judgeName" className="text-right">
                  Name
                </Label>
                <Input id="judgeName" value={formState.judgeName} onChange={(e) => setFormState({ ...formState, judgeName: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emailAddress" className="text-right">
                  Email
                </Label>
                <Input id="emailAddress" value={formState.emailAddress} onChange={(e) => setFormState({ ...formState, emailAddress: e.target.value })} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddEditJudge} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingJudge ? 'Save Changes' : 'Add Judge'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registered Judges</CardTitle>
        </CardHeader>
        <CardContent>
          {judges.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No judges registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('judge_name')}
                        className="h-auto p-0 font-semibold"
                      >
                        Judge Name
                        {sortBy === 'judge_name' ? (
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
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedJudges.map((judge) => (
                    <TableRow key={judge.judge_id}>
                      <TableCell className="font-medium">{judge.judge_name}</TableCell>
                      <TableCell>{judge.email_address}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(judge)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteJudge(judge.judge_id)}>
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

export default ManageJudgesPage;