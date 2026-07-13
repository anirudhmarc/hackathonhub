import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useHackathon } from '@/contexts/HackathonContext';
import { createJudge } from '@/services/api';

export const JudgeSelect = () => {
  const { state, dispatch, refreshData } = useHackathon();
  const { judges, selectedJudge } = state;
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newJudgeName, setNewJudgeName] = useState('');
  const [newJudgeEmail, setNewJudgeEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  useEffect(() => {
    const userEmail = sessionStorage.getItem('user_email');
    if (userEmail) {
      setNewJudgeEmail(userEmail);
    }
  }, []);

  const handleJudgeChange = (judgeId: string) => {
    const judge = judges.find(j => j.id.toString() === judgeId);
    dispatch({ type: 'SELECT_JUDGE', payload: judge || null });
  };

  const handleCreateJudge = async () => {
    if (!newJudgeName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a judge name',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      const { refetch } = createJudge(newJudgeName, newJudgeEmail);
      const result = await refetch();
      
      if (result) {
        const newJudge = { 
          id: result.id, 
          name: newJudgeName,
          email: newJudgeEmail 
        };
        dispatch({ type: 'SET_JUDGES', payload: [...judges, newJudge] });
        
        dispatch({ type: 'SELECT_JUDGE', payload: newJudge });
        
        toast({
          title: 'Success',
          description: `Judge "${newJudgeName}" created successfully!`,
        });
        
        setIsDialogOpen(false);
        setNewJudgeName('');
        setNewJudgeEmail('');
        
        refreshData();
      }
    } catch (error) {
      console.error('Error creating judge:', error);
      toast({
        title: 'Error',
        description: 'Failed to create judge. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedJudge?.id.toString()} onValueChange={handleJudgeChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select Judge" />
        </SelectTrigger>
        <SelectContent>
          {judges.map((judge) => (
            <SelectItem key={judge.id} value={judge.id.toString()}>
              {judge.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="border-dashed border-gray-300 hover:border-gray-400 flex items-center gap-2">
            <span className="text-sm">Add Judge</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Judge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="judgeName" className="text-sm font-medium">
                Judge Name
              </label>
              <Input
                id="judgeName"
                value={newJudgeName}
                onChange={(e) => setNewJudgeName(e.target.value)}
                placeholder="Enter judge name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="judgeEmail" className="text-sm font-medium">
                Judge Email
              </label>
              <Input
                id="judgeEmail"
                value={newJudgeEmail}
                onChange={(e) => setNewJudgeEmail(e.target.value)}
                placeholder="Enter judge email"
                type="email"
              />
              <p className="text-xs text-gray-500">
                This email will be used to automatically select your judge profile when you log in.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreateJudge} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Judge'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
