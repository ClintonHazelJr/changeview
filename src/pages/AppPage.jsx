import { useCallback, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { C, BODY } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';
import TopNav from '../components/layout/TopNav';
import AppSidebar from '../components/layout/AppSidebar';
import SystemAdmin from '../components/admin/SystemAdmin';
import InitiativesPanel from '../components/initiatives/InitiativesPanel';
import Dashboard from '../components/dashboard/Dashboard';
import ProgramsPanel from '../components/programs/ProgramsPanel';
import RequirementsPanel from '../components/requirements/RequirementsPanel';
import SchedulePanel from '../components/schedule/SchedulePanel';
import ReportsPanel from '../components/reports/ReportsPanel';
import ProfilePanel from '../components/profile/ProfilePanel';

function AppShell() {
  const [section, setSection] = useState('dashboard');
  const [initiativeFocusId, setInitiativeFocusId] = useState(null);
  const [adminTabFocus, setAdminTabFocus] = useState(null);

  const openInitiative = (id) => {
    setInitiativeFocusId(id);
    setSection('initiatives');
  };

  const handleNavigate = useCallback((target) => {
    if (!target?.section) return;
    setSection(target.section);
    if (target.initiativeId) setInitiativeFocusId(target.initiativeId);
    if (target.adminTab) setAdminTabFocus(target.adminTab);
    else if (target.section !== 'settings') setAdminTabFocus(null);
  }, []);

  let body = null;
  if (section === 'dashboard') body = <Dashboard onOpenInitiative={openInitiative} />;
  else if (section === 'program') body = <ProgramsPanel />;
  else if (section === 'initiatives') {
    body = (
      <InitiativesPanel
        initialSelectedId={initiativeFocusId}
        onSelectedConsumed={() => setInitiativeFocusId(null)}
      />
    );
  } else if (section === 'requirements') body = <RequirementsPanel />;
  else if (section === 'schedule') body = <SchedulePanel />;
  else if (section === 'reports') body = <ReportsPanel />;
  else if (section === 'profile') body = <ProfilePanel />;
  else if (section === 'settings') {
    body = (
      <SystemAdmin
        initialTab={adminTabFocus}
        onInitialTabConsumed={() => setAdminTabFocus(null)}
      />
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ ...BODY, background: C.bg }}>
      <TopNav onNavigate={handleNavigate} />
      <div className="flex flex-1 min-h-0">
        <AppSidebar section={section} setSection={setSection} />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {body}
        </main>
      </div>
    </div>
  );
}

export default function AppPage() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="text-sm" style={{ color: C.sub }}>Loading...</div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return (
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
  );
}
