import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentHackathon } from '@/contexts/CurrentHackathonContext';
import NoHackathonSelected from '@/components/NoHackathonSelected';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import axios, { isAxiosError } from 'axios';

interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  tag: string;
  max_slots: number;
}

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;

// Hidden agenda track id reused for all problem rows (track concept removed from UI).
const AGENDA_TRACK_ID = '72101be3-6921-11f0-b168-0efd9d2909e1';
// Tag value identifying the fixed judging rubric criteria rows.
const RUBRIC_TAG = '__RUBRIC__';

const ManageRubricPage: React.FC = () => {
  const { idToken } = useAuth();
  const { currentHackathonId } = useCurrentHackathon();
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchRubric = useCallback(async () => {
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

      // Only the fixed rubric criteria rows are managed on this page.
      const transformedCriteria: RubricCriterion[] = apiProblems
        .filter((p: RubricCriterion) => p.tag === RUBRIC_TAG)
        .map((p: RubricCriterion) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          tag: p.tag,
          max_slots: p.max_slots,
        }));

      setCriteria(transformedCriteria);
    } catch (err: unknown) {
      console.error("Error fetching rubric criteria:", err);
      if (isAxiosError(err)) {
        const errorMessage = err.message.includes("Invalid data format")
          ? "API returned unexpected data format. Check Lambda response and API Gateway mapping."
          : err.message || "Failed to fetch rubric criteria.";
        setError(errorMessage);
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        setError("Failed to fetch rubric criteria.");
        toast({ title: "Error", description: "Failed to fetch rubric criteria.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [idToken, currentHackathonId, toast]);

  useEffect(() => {
    if (idToken && currentHackathonId) {
      fetchRubric();
    }
  }, [idToken, currentHackathonId, fetchRubric]);

  const handleFieldChange = (
    id: string,
    field: 'title' | 'description' | 'max_slots',
    value: string,
  ) => {
    setCriteria((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              [field]: field === 'max_slots' ? Number(value) || 0 : value,
            }
          : c,
      ),
    );
  };

  const handleSaveCriterion = async (criterion: RubricCriterion) => {
    setSavingId(criterion.id);
    try {
      // Same payload shape the agenda page uses; rubric rows keep their tag and
      // store the criterion weight in problem_max_slots.
      const payload = {
        problem_title: criterion.title,
        problem_description: criterion.description,
        problem_tag: RUBRIC_TAG,
        problem_max_slots: criterion.max_slots,
        track_id: AGENDA_TRACK_ID,
      };

      await axios({
        method: 'PUT',
        url: `${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/problems/${criterion.id}`,
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      });

      toast({ title: "Success", description: "Rubric criterion updated successfully!", variant: "default" });
      fetchRubric();
    } catch (err: unknown) {
      console.error("Error saving rubric criterion:", err);
      if (isAxiosError(err) && err.response) {
        const errorMessage = err.response.data?.message || "Failed to save rubric criterion.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else if (err instanceof Error) {
        const errorMessage = err.message || "Failed to save rubric criterion.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to save rubric criterion.", variant: "destructive" });
      }
    } finally {
      setSavingId(null);
    }
  };

  if (!currentHackathonId) {
    return <NoHackathonSelected />;
  }

  if (loading) {
    return (
      <div className="aws-container py-8 flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading rubric...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aws-container py-8 text-center text-red-600">
        <p className="text-xl font-bold mb-4">Error Loading Rubric</p>
        <p>{error}</p>
        <Button onClick={fetchRubric} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="aws-container py-8">
      <h1 className="text-3xl font-bold mb-2">Judging Rubric</h1>
      <p className="text-muted-foreground mb-6 max-w-3xl">
        These four criteria match the fixed scoring fields. Edit their descriptions and weights;
        judges and participants see this rubric.
      </p>

      {criteria.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">No rubric criteria found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {criteria.map((criterion) => (
            <Card key={criterion.id}>
              <CardHeader>
                <CardTitle>{criterion.title || 'Untitled Criterion'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 grid gap-2">
                      <Label htmlFor={`title-${criterion.id}`}>Criterion</Label>
                      <Input
                        id={`title-${criterion.id}`}
                        value={criterion.title}
                        onChange={(e) => handleFieldChange(criterion.id, 'title', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`weight-${criterion.id}`}>Weight / Max Points</Label>
                      <Input
                        id={`weight-${criterion.id}`}
                        type="number"
                        value={criterion.max_slots}
                        onChange={(e) => handleFieldChange(criterion.id, 'max_slots', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`description-${criterion.id}`}>Description / Guidance</Label>
                    <Textarea
                      id={`description-${criterion.id}`}
                      value={criterion.description}
                      onChange={(e) => handleFieldChange(criterion.id, 'description', e.target.value)}
                      className="min-h-[100px]"
                      placeholder="Explain what judges should look for in this criterion..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveCriterion(criterion)}
                      disabled={savingId === criterion.id}
                    >
                      {savingId === criterion.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageRubricPage;
