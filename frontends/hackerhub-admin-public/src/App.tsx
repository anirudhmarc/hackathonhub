import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CurrentHackathonProvider } from '@/contexts/CurrentHackathonContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardPage from '@/pages/DashboardPage';
import ManageTeamsPage from '@/pages/ManageTeamsPage';
import ManageJudgesPage from '@/pages/ManageJudgesPage';
import ManageParticipantsPage from '@/pages/ManageParticipantsPage';
import LoginPage from '@/pages/LoginPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';
import CallbackPage from '@/pages/CallbackPage';
import LogoutPage from '@/pages/LogoutPage';
import Layout from '@/components/Layout';
import ManageProblemsPage from '@/pages/ManageProblemsPage';
import ManageRubricPage from '@/pages/ManageRubricPage';
import ManageAssignmentsPage from '@/pages/ManageAssignmentsPage';
import BroadcastEmailPage from '@/pages/BroadcastEmailPage';
import ResultsPage from '@/pages/ResultsPage';
import ManageSubmissionsPage from '@/pages/ManageSubmissionsPage';
import HostHackathonsPage from '@/pages/HostHackathonsPage';
import CreateHackathonPage from '@/pages/CreateHackathonPage';
import NotFound from '@/pages/NotFound';

const MANAGE_GROUPS = ['Admins', 'Hosts'];

const App = () => {
  return (
    <AuthProvider>
      <CurrentHackathonProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/logout" element={<LogoutPage />} />

          <Route element={<Layout />}>
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/hackathons" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><HostHackathonsPage /></ProtectedRoute>} />
            <Route path="/hackathons/new" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><CreateHackathonPage /></ProtectedRoute>} />
            <Route path="/hackathons/:hackathonId/edit" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><CreateHackathonPage /></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><ManageTeamsPage /></ProtectedRoute>} />
            <Route path="/judges" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><ManageJudgesPage /></ProtectedRoute>} />
            <Route path="/participants" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><ManageParticipantsPage /></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><ManageAssignmentsPage /></ProtectedRoute>} />
            <Route path="/problems" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><ManageProblemsPage /></ProtectedRoute>} />
            <Route path="/rubric" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><ManageRubricPage /></ProtectedRoute>} />
            <Route path="/broadcast" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><BroadcastEmailPage /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><ResultsPage /></ProtectedRoute>} />
            <Route path="/submissions" element={<ProtectedRoute allowedGroups={MANAGE_GROUPS}><ManageSubmissionsPage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </CurrentHackathonProvider>
    </AuthProvider>
  );
};

export default App;
