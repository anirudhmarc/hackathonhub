import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClipboardList, ChevronDown } from 'lucide-react';
import { apiService, type ProblemStatement } from '@/services/api';

const RUBRIC_TAG = '__RUBRIC__';

// Preferred display order for the rubric criteria.
const CRITERION_ORDER = ['innovation', 'impact', 'implementation', 'presentation'];

const orderIndex = (name?: string) => {
  const key = (name || '').trim().toLowerCase();
  const idx = CRITERION_ORDER.findIndex((c) => key.includes(c));
  return idx === -1 ? CRITERION_ORDER.length : idx;
};

interface RubricPanelProps {
  className?: string;
  /** When true the panel starts expanded. Defaults to false (collapsed). */
  defaultOpen?: boolean;
}

export const RubricPanel = ({ className, defaultOpen = false }: RubricPanelProps) => {
  const [criteria, setCriteria] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    let active = true;

    const loadRubric = async () => {
      try {
        const response = await apiService.getProblemStatements();
        const data: ProblemStatement[] = Array.isArray(response?.data) ? response.data : [];
        const rubric = data
          .filter((item) => item?.problem_tag === RUBRIC_TAG)
          .sort((a, b) => orderIndex(a.name) - orderIndex(b.name));
        if (active) {
          setCriteria(rubric);
          setFailed(false);
        }
      } catch (error) {
        if (active) {
          setCriteria([]);
          setFailed(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRubric();

    return () => {
      active = false;
    };
  }, []);

  // While loading, render nothing to keep the scoring view uncluttered.
  if (loading) return null;

  // Fetch failed or no rubric rows configured: show an unobtrusive note, never crash.
  if (failed || criteria.length === 0) {
    return (
      <div className={`text-xs text-gray-400 ${className ?? ''}`}>
        Rubric unavailable
      </div>
    );
  }

  return (
    <Card className={`border-blue-200 bg-blue-50/40 ${className ?? ''}`}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center justify-between text-base font-semibold text-blue-900">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600" />
                Judging Rubric
              </span>
              <ChevronDown
                className={`h-4 w-4 text-blue-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {criteria.map((criterion) => (
              <div
                key={criterion.id}
                className="rounded-md border border-blue-100 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">
                    {criterion.name}
                  </span>
                  {criterion.problem_max_slots != null && (
                    <Badge variant="secondary" className="shrink-0">
                      {criterion.problem_max_slots} pts
                    </Badge>
                  )}
                </div>
                {criterion.problem_description && (
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                    {criterion.problem_description}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default RubricPanel;
