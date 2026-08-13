import { useCallback, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { C, BODY, PLAN_LABELS } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { WorkspaceProvider, useWorkspace } from '../contexts/WorkspaceContext';
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
import UsersPanel from '../components/users/UsersPanel';
import TasksPanel from '../components/tasks/TasksPanel';
import UpgradePrompt from '../components/ui/UpgradePrompt';
import TrialEndedGate from '../components/ui/TrialEndedGate';

function AppShell() {
  const { profile, session } = useAuth();
  const {
    hasPaidFeatures: paid,
    trialExpired,
    reload,
  } = useWorkspace();
  const isOwner = profile?.role === 'owner';
  const [params, setParams] = useSearchParams();
  const [checkoutMsg, setCheckoutMsg] = useState('');
  const [showPlanPicker, setShowPlanPicker] = useState(false);

  const [section, setSection] = useState('dashboard');
  const [initiativeFocusId, setInitiativeFocusId] = useState(null);
  const [adminTabFocus, setAdminTabFocus] = useState(null);

  useEffect(() => {
    const checkout = params.get('checkout');
    if (checkout === 'cancelled') {
      setCheckoutMsg('Checkout cancelled — your trial status is unchanged.');
      params.delete('checkout');
      setParams(params, { replace: true });
      return undefined;
    }

    const sessionId = params.get('session_id');
    if (checkout !== 'success' || !sessionId || !session?.access_token) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/complete-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not activate plan');
        if (!cancelled) {
          setCheckoutMsg('Subscription activated. Welcome back.');
          await reload();
        }
      } catch (err) {
        if (!cancelled) setCheckoutMsg(err.message);
      } finally {
        if (!cancelled) {
          params.delete('checkout');
          params.delete('session_id');
          setParams(params, { replace: true });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [params, setParams, session?.access_token, reload]);

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
  else if (section === 'tasks') {
    body = paid
      ? <TasksPanel />
      : <UpgradePrompt feature="Tasks" />;
  } else if (section === 'schedule') {
    body = paid
      ? <SchedulePanel />
      : <UpgradePrompt feature="Schedule" />;
  } else if (section === 'reports') {
    body = <ReportsPanel />;
  } else if (section === 'users') {
    if (!paid) {
      body = (
        <UpgradePrompt
          feature="Users"
          title="Multi-user access requires a paid plan"
          body={(
            <>
              {PLAN_LABELS.tier_1} is single-user. Upgrade to Small or {PLAN_LABELS.tier_2} to invite
              colleagues and assign them to workspaces.
            </>
          )}
        />
      );
    } else if (!isOwner) {
      body = (
        <UpgradePrompt
          title="Owners only"
          body="Only the account owner can manage users and invitations on this account."
        />
      );
    } else {
      body = <UsersPanel />;
    }
  } else if (section === 'profile') body = <ProfilePanel />;
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
      {trialExpired && <TrialEndedGate />}
      {!trialExpired && showPlanPicker && (
        <TrialEndedGate dismissible onClose={() => setShowPlanPicker(false)} />
      )}
      <TopNav onNavigate={handleNavigate} onChoosePlan={() => setShowPlanPicker(true)} />
      {checkoutMsg && (
        <div
          className="px-6 py-2 text-xs font-semibold text-center"
          style={{ background: tintSafe(C.green), color: C.ink }}
        >
          {checkoutMsg}
          <button type="button" className="ml-3 underline" onClick={() => setCheckoutMsg('')}>Dismiss</button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <AppSidebar section={section} setSection={setSection} />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {body}
        </main>
      </div>
    </div>
  );
}

function tintSafe(hex) {
  return `${hex}22`;
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
