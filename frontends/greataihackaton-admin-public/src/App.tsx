import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
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
import ManageAssignmentsPage from '@/pages/ManageAssignmentsPage';
import BroadcastEmailPage from '@/pages/BroadcastEmailPage';
import ResultsPage from '@/pages/ResultsPage';
import NotFound from '@/pages/NotFound';

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/callback" element={<CallbackPage />} />
  <Route path="/logout" element={<LogoutPage />} />

        <Route element={<Layout />}>
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute allowedGroups={['Admins']}><ManageTeamsPage /></ProtectedRoute>} />
          <Route path="/judges" element={<ProtectedRoute allowedGroups={['Admins']}><ManageJudgesPage /></ProtectedRoute>} />
          <Route path="/participants" element={<ProtectedRoute allowedGroups={['Admins']}><ManageParticipantsPage /></ProtectedRoute>} />
          <Route path="/assignments" element={<ProtectedRoute allowedGroups={['Admins']}><ManageAssignmentsPage /></ProtectedRoute>} />
          <Route path="/problems" element={<ProtectedRoute allowedGroups={['Admins']}><ManageProblemsPage /></ProtectedRoute>} />
          <Route path="/broadcast" element={<ProtectedRoute allowedGroups={['Admins']}><BroadcastEmailPage /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute allowedGroups={['Admins']}><ResultsPage /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
};

export default App;