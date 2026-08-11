import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { C, BODY } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';
import TopNav from '../components/layout/TopNav';
import SystemAdmin from '../components/admin/SystemAdmin';
import InitiativesPanel from '../components/initiatives/InitiativesPanel';

function AppShell() {
  const [section, setSection] = useState('admin');

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ ...BODY, background: C.bg }}>
      <TopNav section={section} setSection={setSection} />
      {section === 'admin' ? <SystemAdmin /> : <InitiativesPanel />}
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
