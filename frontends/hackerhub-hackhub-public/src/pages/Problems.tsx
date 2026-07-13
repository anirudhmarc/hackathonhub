import { useAuth } from "@/contexts/AuthContext";
import { useCurrentHackathon } from "@/contexts/CurrentHackathonContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, AlertCircle } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { useState, useEffect } from "react";
import axios from "axios";
import { buildUrl, authHeaders } from "@/lib/apiClient";

// Rows tagged with this sentinel are the hidden "system" problem used to satisfy the
// backend submission contract — they must never be shown as agenda items.
const SYSTEM_TAG = "__SYSTEM__";

interface AgendaItem {
  problem_id: string;
  problem_title: string;
  problem_description: string;
  problem_tag: string; // repurposed as the time / slot label
}

const Problems = () => {
  const { idToken, isLoading: authLoading } = useAuth();
  const { currentHackathonId } = useCurrentHackathon();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsTeam, setNeedsTeam] = useState(false);

  useEffect(() => {
    const fetchAgenda = async () => {
      if (!idToken || !currentHackathonId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<AgendaItem[]>(
          buildUrl(currentHackathonId, "problems"),
          { headers: authHeaders(idToken) }
        );
        const rows = Array.isArray(response.data) ? response.data : [];
        // Hide the hidden system row and the rubric rows; keep only real agenda items.
        const hidden = [SYSTEM_TAG, "__RUBRIC__"];
        setItems(rows.filter((r) => !hidden.includes((r.problem_tag || "").trim())));
        setNeedsTeam(false);
      } catch (err) {
        // The backend returns 404 "Leader not found" until the participant registers a
        // team. That's an expected pre-registration state, not an error.
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 404) {
          setNeedsTeam(true);
          setItems([]);
        } else {
          console.error("Failed to load agenda:", err);
          setError("We couldn't load the agenda right now. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAgenda();
  }, [idToken, currentHackathonId]);

  return (
    <>
      <SEOHead
        title="Agenda | AWS Hackathon"
        description="Event agenda and schedule for the AWS Voice AI Hackathon."
        keywords="Voice AI Hackathon Agenda, AWS, Schedule"
        canonical="/problems"
      />
      <div className="aws-container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Event Agenda</h1>
          <p className="text-muted-foreground mt-1">
            The schedule for the AWS Hackathon. Times are shown as published by the organizers.
          </p>
        </div>

        {authLoading || loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading agenda...</p>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-8">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : needsTeam ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Register your team on the dashboard to view the event agenda.
              </p>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                The agenda will be published here soon. Check back shortly.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.problem_id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <CardTitle className="text-lg">{item.problem_title}</CardTitle>
                    {item.problem_tag && item.problem_tag.trim() && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {item.problem_tag}
                      </Badge>
                    )}
                  </div>
                  {item.problem_description && (
                    <CardDescription className="whitespace-pre-line pt-2 text-sm leading-relaxed">
                      {item.problem_description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent />
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Problems;
