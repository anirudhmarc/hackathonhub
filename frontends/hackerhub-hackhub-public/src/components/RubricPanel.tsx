import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentHackathon } from "@/contexts/CurrentHackathonContext";
import { buildUrl, authHeaders } from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Rows tagged with this sentinel are the judging rubric criteria.
const RUBRIC_TAG = "__RUBRIC__";

// Preferred display order for the four criteria (best-effort).
const RUBRIC_ORDER = ["Innovation", "Impact", "Implementation", "Presentation"];

interface RubricItem {
  problem_id: string;
  problem_title: string;
  problem_description: string;
  problem_tag: string;
  problem_max_slots: number;
  track_name?: string;
}

interface RubricPanelProps {
  className?: string;
}

const RubricPanel = ({ className }: RubricPanelProps) => {
  const { idToken } = useAuth();
  const { currentHackathonId } = useCurrentHackathon();
  const [items, setItems] = useState<RubricItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchRubric = async () => {
      if (!idToken || !currentHackathonId) return;
      try {
        const response = await axios.get<RubricItem[]>(
          buildUrl(currentHackathonId, "problems"),
          { headers: authHeaders(idToken) }
        );
        const rows = Array.isArray(response.data) ? response.data : [];
        const rubric = rows
          .filter((r) => (r.problem_tag || "").trim() === RUBRIC_TAG)
          .sort((a, b) => {
            const ai = RUBRIC_ORDER.indexOf((a.problem_title || "").trim());
            const bi = RUBRIC_ORDER.indexOf((b.problem_title || "").trim());
            // Unknown titles sort to the end, preserving relative order.
            return (ai === -1 ? RUBRIC_ORDER.length : ai) - (bi === -1 ? RUBRIC_ORDER.length : bi);
          });
        if (!cancelled) setItems(rubric);
      } catch (err) {
        // The /participant/problems endpoint returns 404 "Leader not found" for users
        // without a registered team. Degrade silently in all error cases.
        if (!cancelled) setItems([]);
      }
    };

    fetchRubric();
    return () => {
      cancelled = true;
    };
  }, [idToken, currentHackathonId]);

  // Render nothing when there is no rubric to show (no team, fetch error, or empty).
  if (items.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>How You'll Be Judged</CardTitle>
        <CardDescription>
          The criteria judges use to score your submission.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {items.map((item) => (
            <div key={item.problem_id} className="space-y-1">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="font-bold">{item.problem_title}</span>
                <Badge variant="secondary">{item.problem_max_slots} pts</Badge>
              </div>
              {item.problem_description && (
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {item.problem_description}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RubricPanel;
