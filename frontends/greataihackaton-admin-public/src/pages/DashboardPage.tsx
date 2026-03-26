import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from 'react-oidc-context';

const API_URL = import.meta.env.VITE_API_URL;

interface DashboardStats {
  participants: number;
  teams: number;
  judges: number;
  problems: number;
  assignments: number;
}

const StatCard: React.FC<{ label: string; value: number | string; href: string; icon: string }> = ({ label, value, href, icon }) => (
  <Link
    to={href}
    className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
  >
    <span className="text-2xl">{icon}</span>
    <div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </Link>
);

const QuickLink: React.FC<{ label: string; href: string; description: string }> = ({ label, href, description }) => (
  <Link
    to={href}
    className="group rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-sm"
  >
    <p className="font-medium text-gray-900 group-hover:text-indigo-600">{label}</p>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </Link>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ participants: 0, teams: 0, judges: 0, problems: 0, assignments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = user?.id_token;
    if (!token) return;

    const headers = { Authorization: token };

    const count = (result: PromiseSettledResult<{ data: unknown }>) => {
      if (result.status !== 'fulfilled') return 0;
      const d = result.value.data;
      if (Array.isArray(d)) return d.length;
      if (d && typeof d === 'object' && 'teams' in d) return (d as { teams: unknown[] }).teams?.length ?? 0;
      if (d && typeof d === 'object' && 'problems' in d) return (d as { problems: unknown[] }).problems?.length ?? 0;
      return 0;
    };

    Promise.allSettled([
      axios.get(`${API_URL}/admin/participants`, { headers }),
      axios.get(`${API_URL}/admin/teams`, { headers }),
      axios.get(`${API_URL}/admin/judges`, { headers }),
      axios.get(`${API_URL}/admin/problems`, { headers }),
      axios.get(`${API_URL}/admin/assignments`, { headers }),
    ]).then(([participants, teams, judges, problems, assignments]) => {
      setStats({
        participants: count(participants),
        teams: count(teams),
        judges: count(judges),
        problems: count(problems),
        assignments: count(assignments),
      });
    }).catch(() => {
      // Stats remain at 0 on failure — non-critical
    }).finally(() => {
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Hackathon management overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard label="Participants" value={loading ? '—' : stats.participants} href="/participants" icon="👥" />
        <StatCard label="Teams" value={loading ? '—' : stats.teams} href="/teams" icon="🏢" />
        <StatCard label="Judges" value={loading ? '—' : stats.judges} href="/judges" icon="⚖️" />
        <StatCard label="Problems" value={loading ? '—' : stats.problems} href="/problems" icon="📋" />
        <StatCard label="Assignments" value={loading ? '—' : stats.assignments} href="/assignments" icon="🔗" />
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickLink label="Manage Participants" href="/participants" description="View, approve, or remove participants" />
          <QuickLink label="Manage Teams" href="/teams" description="Create teams and assign problems" />
          <QuickLink label="Manage Judges" href="/judges" description="Add judges and track progress" />
          <QuickLink label="Problem Statements" href="/problems" description="Create and edit problem statements" />
          <QuickLink label="Judge Assignments" href="/assignments" description="Assign judges to teams" />
          <QuickLink label="Leaderboards" href="/leaderboard" description="View rankings and scores" />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;