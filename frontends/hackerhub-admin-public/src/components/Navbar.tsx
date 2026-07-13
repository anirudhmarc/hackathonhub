import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import BrandLockup from './BrandLockup';
import { useCurrentHackathon } from '@/contexts/CurrentHackathonContext';

const Navbar: React.FC = () => {
  const { user, removeUser } = useOidcAuth();
  const { hackathons, currentHackathonId, setCurrentHackathonId } = useCurrentHackathon();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const hackathonSelector = (
    <select
      aria-label="Select hackathon"
      value={currentHackathonId || ''}
      onChange={(e) => setCurrentHackathonId(e.target.value || null)}
      className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 max-w-[200px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">
        {hackathons.length === 0 ? 'No hackathons' : 'Select hackathon…'}
      </option>
      {hackathons.map((h) => (
        <option key={h.hackathon_id} value={h.hackathon_id}>
          {h.name}
        </option>
      ))}
    </select>
  );

  const pathname = location.pathname || '/';

  const desktopLinkClass = (path: string) => {
    const base = 'px-3 py-2 rounded transition-colors duration-150';
    if (path === '/' ? pathname === '/' : pathname.startsWith(path)) {
      return `${base} text-indigo-600 font-semibold`;
    }
    return `${base} text-gray-700 hover:text-indigo-600 hover:bg-white`;
  };

  const mobileLinkClass = (path: string) => {
    const base = 'block px-2 py-2 rounded';
    if (path === '/' ? pathname === '/' : pathname.startsWith(path)) {
      return `${base} text-indigo-600 font-semibold`;
    }
    return `${base} text-gray-700 hover:bg-gray-50`;
  };

  const handleLogout = async () => {
    // Save id_token before clearing OIDC state
    const idToken = user?.id_token;

    // Clear OIDC in-memory state so isAuthenticated becomes false
    await removeUser();

    localStorage.clear();
    sessionStorage.clear();

    const cognitoDomain = import.meta.env.VITE_ADMIN_COGNITO_AUTH_DOMAIN;
    const clientId = import.meta.env.VITE_ADMIN_COGNITO_CLIENT_ID;
    const postLogoutRedirectUri = import.meta.env.VITE_ADMIN_COGNITO_LOGOUT_URI || window.location.origin;

    if (cognitoDomain && clientId) {
      const domain = cognitoDomain.startsWith('http') ? cognitoDomain : `https://${cognitoDomain}`;
      let logoutUrl = `${domain.replace(/\/$/, '')}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
      if (idToken) {
        logoutUrl += `&id_token_hint=${idToken}`;
      }
      window.location.href = logoutUrl;
      return;
    }

    // Fallback if Cognito domain not configured
    navigate('/login', { replace: true });
  };

  return (
    <nav className="bg-white border-b border-gray-100 w-full">
      <div className="w-full flex items-center justify-between gap-4 px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <BrandLockup size="sm" />
          <div className="leading-tight border-l border-gray-200 pl-3">
            <div className="text-base font-bold text-gray-900">AWS Hackathon</div>
            <div className="text-xs text-gray-500">Admin System</div>
          </div>
        </div>

        
        <div className="hidden md:flex flex-1 justify-center">
          <ul className="flex items-center gap-6 text-sm">
            <li>
              <Link to="/" className={desktopLinkClass('/')}>Dashboard</Link>
            </li>
            <li>
              <Link to="/hackathons" className={desktopLinkClass('/hackathons')}>Hackathons</Link>
            </li>
            <li>
              <Link to="/participants" className={desktopLinkClass('/participants')}>Participants</Link>
            </li>
            <li>
              <Link to="/teams" className={desktopLinkClass('/teams')}>Teams</Link>
            </li>
            <li>
              <Link to="/submissions" className={desktopLinkClass('/submissions')}>Submissions</Link>
            </li>
            <li>
              <Link to="/judges" className={desktopLinkClass('/judges')}>Judges</Link>
            </li>
            <li>
              <Link to="/problems" className={desktopLinkClass('/problems')}>Agenda</Link>
            </li>
            <li>
              <Link to="/rubric" className={desktopLinkClass('/rubric')}>Rubric</Link>
            </li>
            <li>
              <Link to="/assignments" className={desktopLinkClass('/assignments')}>Assignments</Link>
            </li>
            <li>
              <Link to="/leaderboard" className={desktopLinkClass('/leaderboard')}>Leaderboards</Link>
            </li>
          </ul>
        </div>

        
        <div className="flex items-center gap-3 md:hidden">
          
          <button
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((s) => !s)}
            className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {mobileOpen ? (
              <svg className="h-6 w-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              
              <svg className="h-6 w-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        
        <div className="hidden md:flex items-center gap-4">
          {hackathonSelector}
          <div className="flex flex-col items-end gap-1">
          <div className="text-sm text-gray-700 truncate max-w-[220px] text-right">
            { (user as any)?.profile?.email || (user as any)?.email || (user as any)?.preferred_username || '' }
          </div>

          <a
            onClick={(e) => { e.preventDefault(); handleLogout(); }}
            className="text-sm text-sky-600 hover:underline cursor-pointer py-1 px-2"
            href="#logout"
          >
            Logout
          </a>
          </div>
        </div>
      </div>


      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-sm">
          <div className="px-4 py-3">
            <div className="mb-3 text-sm text-gray-700 truncate">
              { (user as any)?.profile?.email || (user as any)?.email || (user as any)?.preferred_username || '' }
            </div>

            <div className="mb-3">{hackathonSelector}</div>

              <ul className="flex flex-col gap-2">
              <li>
                <Link onClick={() => setMobileOpen(false)} to="/" className={mobileLinkClass('/')}>Dashboard</Link>
              </li>
              <li>
                <Link onClick={() => setMobileOpen(false)} to="/hackathons" className={mobileLinkClass('/hackathons')}>Hackathons</Link>
              </li>
              <li>
                <Link onClick={() => setMobileOpen(false)} to="/participants" className={mobileLinkClass('/participants')}>Participants</Link>
              </li>
              <li>
                <Link onClick={() => setMobileOpen(false)} to="/teams" className={mobileLinkClass('/teams')}>Teams</Link>
              </li>
              <li>
                <Link onClick={() => setMobileOpen(false)} to="/submissions" className={mobileLinkClass('/submissions')}>Submissions</Link>
              </li>
              <li>
                <Link onClick={() => setMobileOpen(false)} to="/judges" className={mobileLinkClass('/judges')}>Judges</Link>
              </li>
              <li>
                <Link onClick={() => setMobileOpen(false)} to="/problems" className={mobileLinkClass('/problems')}>Agenda</Link>
              </li>
              <li>
                <Link onClick={() => setMobileOpen(false)} to="/rubric" className={mobileLinkClass('/rubric')}>Rubric</Link>
              </li>
              <li>
                <Link onClick={() => setMobileOpen(false)} to="/assignments" className={mobileLinkClass('/assignments')}>Assignments</Link>
              </li>
              {/* <li>
                <Link onClick={() => setMobileOpen(false)} to="/broadcast" className={mobileLinkClass('/broadcast')}>Broadcasts</Link>
              </li> */}
              <li>
                <Link onClick={() => setMobileOpen(false)} to="/leaderboard" className={mobileLinkClass('/leaderboard')}>Leaderboards</Link>
              </li>
            </ul>

            <div className="mt-3 border-t pt-3">
              <a
                onClick={(e) => { e.preventDefault(); setMobileOpen(false); handleLogout(); }}
                className="block text-sm text-sky-600 hover:underline cursor-pointer"
                href="#logout"
              >
                Logout
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;