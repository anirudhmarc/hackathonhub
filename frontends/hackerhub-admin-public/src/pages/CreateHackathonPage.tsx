import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios, { isAxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentHackathon } from '@/contexts/CurrentHackathonContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Save } from 'lucide-react';

const API_BASE_URL: string = import.meta.env.VITE_API_URL;

interface HackathonForm {
  name: string;
  submission_start: string;
  submission_end: string;
  scoring_start: string;
  scoring_end: string;
  scoring_lock: string;
  status: string;
}

const EMPTY_FORM: HackathonForm = {
  name: '',
  submission_start: '',
  submission_end: '',
  scoring_start: '',
  scoring_end: '',
  scoring_lock: '',
  status: '',
};

// datetime-local inputs use `YYYY-MM-DDTHH:mm`; convert to/from ISO for the API.
function toInputValue(value?: unknown): string {
  if (!value || typeof value !== 'string') return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

const CreateHackathonPage: React.FC = () => {
  const navigate = useNavigate();
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const isEdit = Boolean(hackathonId);
  const { idToken } = useAuth();
  const { refresh, setCurrentHackathonId } = useCurrentHackathon();
  const { toast } = useToast();

  const [form, setForm] = useState<HackathonForm>(EMPTY_FORM);
  const [loading, setLoading] = useState<boolean>(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // existing logo (presigned) or local object URL

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }),
    [idToken],
  );

  useEffect(() => {
    if (!isEdit || !idToken || !hackathonId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/hackathons/${hackathonId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = res.data || {};
        if (!cancelled) {
          setForm({
            name: data.name || '',
            submission_start: toInputValue(data.submission_start),
            submission_end: toInputValue(data.submission_end),
            scoring_start: toInputValue(data.scoring_start),
            scoring_end: toInputValue(data.scoring_end),
            scoring_lock: toInputValue(data.scoring_lock),
            status: data.status || '',
          });
          if (data.logo_url) setLogoPreview(data.logo_url);
        }
      } catch (err) {
        const msg = isAxiosError(err) ? err.response?.data?.message || err.message : 'Failed to load hackathon.';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, idToken, hackathonId, toast]);

  const update = (field: keyof HackathonForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const onLogoSelected = (file: File | null) => {
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : logoPreview);
  };

  // Upload the chosen logo for a given hackathon: get a presigned PUT, upload the
  // file, then persist the canonical logo_url on the hackathon. Returns logo_url.
  const uploadLogo = async (hid: string): Promise<string | undefined> => {
    if (!logoFile) return undefined;
    const signRes = await axios.post(
      `${API_BASE_URL}/hackathons/${hid}/logo-url`,
      { fileType: logoFile.type || 'image/png' },
      { headers: authHeaders },
    );
    const { presignedUrl, logoUrl } = signRes.data || {};
    await axios.put(presignedUrl, logoFile, { headers: { 'Content-Type': logoFile.type || 'image/png' } });
    await axios.put(`${API_BASE_URL}/hackathons/${hid}`, { logo_url: logoUrl }, { headers: authHeaders });
    return logoUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a hackathon name.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { name: form.name.trim() };
      const timeline: Array<[keyof HackathonForm, string]> = [
        ['submission_start', 'submission_start'],
        ['submission_end', 'submission_end'],
        ['scoring_start', 'scoring_start'],
        ['scoring_end', 'scoring_end'],
        ['scoring_lock', 'scoring_lock'],
      ];
      for (const [field, key] of timeline) {
        const iso = toIso(form[field]);
        if (iso) payload[key] = iso;
      }
      if (form.status) payload.status = form.status;

      let targetId = hackathonId;
      if (isEdit && hackathonId) {
        await axios.put(`${API_BASE_URL}/hackathons/${hackathonId}`, payload, { headers: authHeaders });
      } else {
        const res = await axios.post(`${API_BASE_URL}/hackathons`, payload, { headers: authHeaders });
        targetId = res.data?.hackathon_id;
        if (targetId) setCurrentHackathonId(targetId);
      }
      // Upload logo (if selected) once we have a hackathon id.
      if (logoFile && targetId) {
        try {
          await uploadLogo(targetId);
        } catch (logoErr) {
          const lm = isAxiosError(logoErr) ? logoErr.response?.data?.message || logoErr.message : 'Logo upload failed.';
          toast({ title: 'Saved, but logo upload failed', description: lm, variant: 'destructive' });
        }
      }
      toast({ title: isEdit ? 'Saved' : 'Created', description: isEdit ? 'Hackathon updated.' : 'Hackathon created.' });
      await refresh();
      navigate('/hackathons');
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message || err.message : 'Failed to save hackathon.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-600">Loading hackathon…</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate('/hackathons')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Hackathons
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Hackathon' : 'Create Hackathon'}</CardTitle>
          <CardDescription>
            Set the name and (optionally) the submission and scoring timeline. Times use your local timezone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Summer AI Hackathon 2026"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logo">Hackathon Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-md object-contain border border-gray-200 bg-white" />
                ) : (
                  <div className="h-16 w-16 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 text-center">No logo</div>
                )}
                <Input
                  id="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                  onChange={(e) => onLogoSelected(e.target.files?.[0] ?? null)}
                  className="max-w-xs"
                />
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, SVG, WebP, or GIF. Falls back to a default logo if none is set.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="submission_start">Submission Start</Label>
                <Input
                  id="submission_start"
                  type="datetime-local"
                  value={form.submission_start}
                  onChange={(e) => update('submission_start', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="submission_end">Submission End</Label>
                <Input
                  id="submission_end"
                  type="datetime-local"
                  value={form.submission_end}
                  onChange={(e) => update('submission_end', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="scoring_start">Scoring Start</Label>
                <Input
                  id="scoring_start"
                  type="datetime-local"
                  value={form.scoring_start}
                  onChange={(e) => update('scoring_start', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scoring_end">Scoring End</Label>
                <Input
                  id="scoring_end"
                  type="datetime-local"
                  value={form.scoring_end}
                  onChange={(e) => update('scoring_end', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="scoring_lock">Scoring Lock</Label>
                <Input
                  id="scoring_lock"
                  type="datetime-local"
                  value={form.scoring_lock}
                  onChange={(e) => update('scoring_lock', e.target.value)}
                />
              </div>
              {isEdit && (
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Input
                    id="status"
                    value={form.status}
                    onChange={(e) => update('status', e.target.value)}
                    placeholder="e.g. draft, active, closed"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/hackathons')}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isEdit ? 'Save Changes' : 'Create Hackathon'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateHackathonPage;
