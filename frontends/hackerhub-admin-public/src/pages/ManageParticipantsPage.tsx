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
import { Loader2, RefreshCw, PlusCircle, Edit, Trash2, Check, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import axios, { isAxiosError } from 'axios';

interface Participant {
  id?: string;
  participant_id: string;
  agreeEmailCommunications: boolean;
  agreeMarketingEmails: boolean;
  agreeTermsConditions: boolean;
  emails: string[];
  leader: {
    name: string;
    email: string;
  };
  memberCount: number;
  members: Array<string | { name: string, email?: string }>;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  teamName: string;
  track: string;
}

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;

const ManageParticipantsPage: React.FC = () => {
  const { idToken } = useAuth();
  const { currentHackathonId } = useCurrentHackathon();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [formState, setFormState] = useState({
    teamName: '',
    leaderName: '',
    leaderEmail: '',
    track: '',
    members: '',
    emails: '',
    agreeEmailCommunications: false,
    agreeMarketingEmails: false,
    agreeTermsConditions: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sortBy, setSortBy] = useState<'teamName' | 'leader.name' | 'leader.email' | 'track' | 'status' | 'submittedAt' | null>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [searchTerm, setSearchTerm] = useState('');

  const fetchParticipants = useCallback(async () => {
    if (!idToken || !currentHackathonId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/participants`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      
      const processedParticipants = response.data.map((p: Participant) => ({
        ...p,
        leader: typeof p.leader === 'string' && p.leader ? JSON.parse(p.leader) : p.leader,
        members: typeof p.members === 'string' && p.members ? JSON.parse(p.members) : p.members,
      }));
      const sortedParticipants = processedParticipants.sort((a: Participant, b: Participant) => {
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      });
      setParticipants(sortedParticipants);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to fetch participants.");
        toast({ title: "Error", description: err.message || "Failed to fetch participants.", variant: "destructive" });
      } else {
        setError("Failed to fetch participants.");
        toast({ title: "Error", description: "Failed to fetch participants.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [idToken, currentHackathonId, toast]);

  useEffect(() => {
    if (idToken && currentHackathonId) {
      fetchParticipants();
    }
  }, [idToken, currentHackathonId, fetchParticipants]);

  useEffect(() => {
    if (editingParticipant) {
      const membersString = (editingParticipant.members || [])
        .filter(member => member !== null && member !== undefined)
        .map(member => (typeof member === 'object' && member !== null && 'name' in member ? member.name : String(member)))
        .join(', ');

      setFormState({
        teamName: editingParticipant.teamName,
        leaderName: editingParticipant.leader?.name || '',
        leaderEmail: editingParticipant.leader?.email || '',
        track: editingParticipant.track,
        members: membersString,
        emails: (editingParticipant.emails || []).join(', '),
        agreeEmailCommunications: editingParticipant.agreeEmailCommunications,
        agreeMarketingEmails: editingParticipant.agreeMarketingEmails,
        agreeTermsConditions: editingParticipant.agreeTermsConditions,
      });
      setIsDialogOpen(true);
    }
  }, [editingParticipant]);

  const handleOpenDialog = (participantToEdit: Participant | null = null) => {
    setEditingParticipant(participantToEdit);
    if (participantToEdit) {
      const membersString = (participantToEdit.members || [])
        .filter(member => member !== null && member !== undefined)
        .map(member => (typeof member === 'object' && member !== null && 'name' in member ? member.name : String(member)))
        .join(', ');
      setFormState({
        teamName: participantToEdit.teamName,
        leaderName: participantToEdit.leader?.name || '',
        leaderEmail: participantToEdit.leader?.email || '',
        track: participantToEdit.track,
        members: membersString,
        emails: (participantToEdit.emails || []).join(', '),
        agreeEmailCommunications: participantToEdit.agreeEmailCommunications,
        agreeMarketingEmails: participantToEdit.agreeMarketingEmails,
        agreeTermsConditions: participantToEdit.agreeTermsConditions,
      });
    } else {
      setFormState({
        teamName: '',
        leaderName: '',
        leaderEmail: '',
        track: '',
        members: '',
        emails: '',
        agreeEmailCommunications: false,
        agreeMarketingEmails: false,
        agreeTermsConditions: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleAddEditParticipant = async () => {
    setIsSubmitting(true);
    try {
      const method = editingParticipant ? 'PUT' : 'POST';
      const url = editingParticipant
        ? `${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/participants/${editingParticipant.participant_id || editingParticipant.id}`
        : `${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/participants`;

      const parsedMembersForBackend = formState.members
        .split(',')
        .map(m => m.trim())
        .filter(m => m !== '')
        .map(name => ({ name }));

      const payload = {
        teamName: formState.teamName,
        leader: {
          name: formState.leaderName,
          email: formState.leaderEmail,
        },
        track: formState.track,
        members: parsedMembersForBackend,
        emails: formState.emails.split(',').map(e => e.trim()).filter(e => e !== ''),
        agreeEmailCommunications: formState.agreeEmailCommunications,
        agreeMarketingEmails: formState.agreeMarketingEmails,
        agreeTermsConditions: formState.agreeTermsConditions,
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

  toast({ title: "Success", description: `Participant ${editingParticipant ? 'updated' : 'added'} successfully!`, variant: "default" });
      
  setIsDialogOpen(false);
  setEditingParticipant(null);
  fetchParticipants();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response) {
        const errorMessage = err.response.data?.message || "Failed to save participant.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else if (err instanceof Error) {
        const errorMessage = err.message || "Failed to save participant.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to save participant.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!confirm("Are you sure you want to delete this participant? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    try {
      await axios.delete(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/participants/${participantId}`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
  toast({ title: "Success", description: "Participant deleted successfully!", variant: "default" });
  fetchParticipants();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response) {
        const errorMessage = err.response.data?.message || "Failed to delete participant.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else if (err instanceof Error) {
        const errorMessage = err.message || "Failed to delete participant.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to delete participant.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveParticipant = async (participant: Participant) => {
    if (!confirm(`Are you sure you want to approve team "${participant.teamName}"? This will create a team entry and update their status.`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/participants/${participant.participant_id || participant.id}/approve`, {
        leaderName: participant.leader?.name,
        track: participant.track,
        leaderEmail: participant.leader?.email,
      }, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

  toast({ title: "Success", description: `Participant "${participant.teamName}" approved and team created!`, variant: "default" });
  fetchParticipants();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response) {
        const errorMessage = err.response.data?.message || "Failed to approve participant.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else if (err instanceof Error) {
        const errorMessage = err.message || "Failed to approve participant.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to approve participant.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const { totalTeams, totalPeople, teamSizeBreakdown } = useMemo(() => {
    const totalTeamsCount = participants.length;

    // Count every participant + their members, regardless of track.
    const totalPeopleCount = participants.reduce((sum, p) => sum + 1 + (p.members || []).length, 0);

    const teamSizeCounts = participants.reduce((counts, p) => {
      const teamSize = 1 + (p.members || []).length;
      counts[teamSize] = (counts[teamSize] || 0) + 1;
      return counts;
    }, {} as Record<number, number>);

    return {
      totalTeams: totalTeamsCount,
      totalPeople: totalPeopleCount,
      teamSizeBreakdown: teamSizeCounts,
    };
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    let result = participants;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(p => {
        
        const basicMatch = p.teamName.toLowerCase().includes(searchLower) ||
          p.leader.name.toLowerCase().includes(searchLower) ||
          p.leader.email.toLowerCase().includes(searchLower);
        
        
        const memberMatch = p.members.some(member => {
          if (typeof member === 'string') {
            return member.toLowerCase().includes(searchLower);
          } else if (member && typeof member === 'object') {
            return (member.name && member.name.toLowerCase().includes(searchLower)) ||
                   (member.email && member.email.toLowerCase().includes(searchLower));
          }
          return false;
        });
        
        return basicMatch || memberMatch;
      });
    }

    
    if (sortBy) {
      result = [...result].sort((a, b) => {
        let aValue: string | Date = '';
        let bValue: string | Date = '';

        switch (sortBy) {
          case 'teamName':
            aValue = a.teamName.toLowerCase();
            bValue = b.teamName.toLowerCase();
            break;
          case 'leader.name':
            aValue = a.leader.name.toLowerCase();
            bValue = b.leader.name.toLowerCase();
            break;
          case 'leader.email':
            aValue = a.leader.email.toLowerCase();
            bValue = b.leader.email.toLowerCase();
            break;
          case 'track':
            aValue = a.track.toLowerCase();
            bValue = b.track.toLowerCase();
            break;
          case 'status':
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case 'submittedAt':
            aValue = new Date(a.submittedAt);
            bValue = new Date(b.submittedAt);
            break;
        }

        if (aValue instanceof Date && bValue instanceof Date) {
          if (sortOrder === 'asc') {
            return aValue.getTime() - bValue.getTime();
          } else {
            return bValue.getTime() - aValue.getTime();
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
  }, [participants, searchTerm, sortBy, sortOrder]);

  const handleSort = (column: 'teamName' | 'leader.name' | 'leader.email' | 'track' | 'status' | 'submittedAt') => {
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
        <p className="ml-4 text-lg">Loading participants...</p>
      </div>
    );
  }

  
  if (error) {
    return (
      <div className="aws-container py-8 text-center text-red-600">
        <p className="text-xl font-bold mb-4">Error Loading Participants</p>
        <p>{error}</p>
        <Button onClick={fetchParticipants} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="aws-container py-8">
      <h1 className="text-3xl font-bold mb-6">Manage Participants</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Hackathon Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex-1 flex flex-col p-4 bg-muted/50 rounded-md">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">Total Teams:</h3>
                <span className="text-2xl font-bold">{totalTeams}</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col p-4 bg-muted/50 rounded-md">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">Total Participants:</h3>
                <span className="text-2xl font-bold">{totalPeople}</span>
              </div>
            </div>

          </div>
          <div className="p-4 bg-muted/50 rounded-md">
            <h3 className="font-medium mb-2">Team Size Breakdown:</h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(teamSizeBreakdown)
                .sort(([sizeA], [sizeB]) => Number(sizeA) - Number(sizeB))
                .map(([size, count]) => (
                  <div key={size} className="flex-shrink-0 px-3 py-1 bg-white rounded-full border">
                    <span className="text-sm font-medium">{size}-member teams:</span>
                    <span className="text-sm font-bold ml-1">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="search">Search:</Label>
            <Input
              id="search"
              placeholder="Search teams, leaders, members, or emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Participant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white shadow-md rounded-lg">
            <DialogHeader>
              <DialogTitle>{editingParticipant ? 'Edit Participant' : 'Add New Participant'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the participant.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="teamName" className="text-right">
                  Team Name
                </Label>
                <Input id="teamName" value={formState.teamName} onChange={(e) => setFormState({ ...formState, teamName: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="leaderName" className="text-right">
                  Leader Name
                </Label>
                <Input id="leaderName" value={formState.leaderName} onChange={(e) => setFormState({ ...formState, leaderName: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="leaderEmail" className="text-right">
                  Leader Email
                </Label>
                <Input id="leaderEmail" value={formState.leaderEmail} onChange={(e) => setFormState({ ...formState, leaderEmail: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="members" className="text-right">
                  Members (comma-separated)
                </Label>
                <Input id="members" value={formState.members} onChange={(e) => setFormState({ ...formState, members: e.target.value })} className="col-span-3" placeholder="Member1, Member2, Member3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emails" className="text-right">
                  Emails (comma-separated)
                </Label>
                <Input id="emails" value={formState.emails} onChange={(e) => setFormState({ ...formState, emails: e.target.value })} className="col-span-3" placeholder="email1@example.com, email2@example.com" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddEditParticipant} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingParticipant ? 'Save Changes' : 'Add Participant'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>List of All Participants</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredParticipants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No participants found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('teamName')}
                        className="h-auto p-0 font-semibold"
                      >
                        Team Name
                        {sortBy === 'teamName' ? (
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
                        onClick={() => handleSort('leader.name')}
                        className="h-auto p-0 font-semibold"
                      >
                        Leader Name
                        {sortBy === 'leader.name' ? (
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
                        onClick={() => handleSort('leader.email')}
                        className="h-auto p-0 font-semibold"
                      >
                        Leader Email
                        {sortBy === 'leader.email' ? (
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
                        onClick={() => handleSort('status')}
                        className="h-auto p-0 font-semibold"
                      >
                        Status
                        {sortBy === 'status' ? (
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
                        onClick={() => handleSort('submittedAt')}
                        className="h-auto p-0 font-semibold"
                      >
                        Submitted At
                        {sortBy === 'submittedAt' ? (
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
                    <TableHead>Members</TableHead>
                    <TableHead>Emails (Registered)</TableHead>
                    <TableHead>Agreed to Emails</TableHead>
                    <TableHead>Agreed to Marketing</TableHead>
                    <TableHead>Agreed to T&C</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.map((participant) => (
                    <TableRow key={participant.participant_id || participant.id}>
                      <TableCell className="font-medium">{participant.teamName}</TableCell>
                      <TableCell>{participant.leader?.name}</TableCell>
                      <TableCell>{participant.leader?.email}</TableCell>
                      <TableCell>{participant.status}</TableCell>
                      <TableCell>{participant.submittedAt}</TableCell>
                      <TableCell>
                        {participant.members && participant.members.length > 0 ? (
                          <div className="flex flex-col">
                            {(participant.members || [])
                              .filter(member => member !== null && member !== undefined)
                              .map((member, index) => {
                              const memberName = typeof member === 'object' && member !== null && 'name' in member
                                ? member.name
                                : String(member);

                              return <span key={index}>{memberName}</span>;
                            })}
                          </div>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>{(participant.emails || []).join(', ')}</TableCell>
                      <TableCell>{participant.agreeEmailCommunications ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{participant.agreeMarketingEmails ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{participant.agreeTermsConditions ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {participant.status === 'PENDING_APPROVAL' && (
                            <Button variant="outline" size="sm" onClick={() => handleApproveParticipant(participant)} title="Approve Participant">
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(participant)} title="Edit Participant">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteParticipant(participant.participant_id || participant.id || '')} title="Delete Participant">
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

export default ManageParticipantsPage;