import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { C, BODY, PLAN_LABELS } from '../lib/constants';
import { supabase } from '../lib/supabase';
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
import BillingGate from '../components/ui/BillingGate';
import OnboardingTour from '../components/onboarding/OnboardingTour';

function AppShell() {
  const { profile, session } = useAuth();
  const {
    hasPaidFeatures: paid,
    trialActive,
    pastDue,
    needsCheckout: checkoutNeeded,
    activeWorkspaceId,
    loading: workspaceLoading,
    reload,
  } = useWorkspace();
  const isOwner = profile?.role === 'owner';
  // Trial unlocks Schedule/Tasks/Users/paid reports even on Starter tier.
  const featuresUnlocked = paid || trialActive;
  const [params, setParams] = useSearchParams();
  const [checkoutMsg, setCheckoutMsg] = useState('');
  const [profileUpgradeOpen, setProfileUpgradeOpen] = useState(false);

  const [section, setSection] = useState('dashboard');
  const [initiativeFocusId, setInitiativeFocusId] = useState(null);
  const [initiativeFocusTab, setInitiativeFocusTab] = useState(null);
  const [programFocusId, setProgramFocusId] = useState(null);
  const [taskFocusId, setTaskFocusId] = useState(null);
  const [adminTabFocus, setAdminTabFocus] = useState(null);
  const [openAddOrg, setOpenAddOrg] = useState(false);
  // true when this workspace still needs a first Org (checked once per workspace)
  const [needsOrgSetup, setNeedsOrgSetup] = useState(false);
  const [orgCheckDone, setOrgCheckDone] = useState(false);
  const orgSetupCheckedForWs = useRef(null);

  const tourPending = Boolean(profile && !profile.onboarding_completed_at);

  // Detect empty workspace. Do not open Add Org yet if the tour is still pending —
  // the tour finishes by handing off into that prompt.
  useEffect(() => {
    if (workspaceLoading || !activeWorkspaceId) return undefined;
    if (orgSetupCheckedForWs.current === activeWorkspaceId) return undefined;

    let cancelled = false;
    setOrgCheckDone(false);
    (async () => {
      const { count, error } = await supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', activeWorkspaceId);
      if (cancelled) return;
      orgSetupCheckedForWs.current = activeWorkspaceId;
      const empty = !error && (count ?? 0) === 0;
      setNeedsOrgSetup(empty);
      setOrgCheckDone(true);
    })();

    return () => { cancelled = true; };
  }, [activeWorkspaceId, workspaceLoading]);

  const startAddOrgFlow = useCallback(() => {
    setSection('settings');
    setAdminTabFocus('org');
    setOpenAddOrg(true);
  }, []);

  const markOrgSetupComplete = useCallback(() => {
    setNeedsOrgSetup(false);
    setOpenAddOrg(false);
  }, []);

  // After the tour is done (or if they already finished it), require Add Org when none exists.
  useEffect(() => {
    if (!orgCheckDone || tourPending || !needsOrgSetup) return;
    startAddOrgFlow();
  }, [orgCheckDone, tourPending, needsOrgSetup, startAddOrgFlow]);

  // Keep them on System Admin while mandatory Add Org is showing (post-tour).
  useEffect(() => {
    if (tourPending || !needsOrgSetup) return;
    if (section !== 'settings') {
      setSection('settings');
      setAdminTabFocus('org');
      setOpenAddOrg(true);
    }
  }, [tourPending, needsOrgSetup, section]);

  const handleTourFinished = useCallback(() => {
    if (needsOrgSetup) startAddOrgFlow();
  }, [needsOrgSetup, startAddOrgFlow]);

  useEffect(() => {
    const checkout = params.get('checkout');
    if (checkout === 'cancelled') {
      setCheckoutMsg('Checkout cancelled — add a card to start your trial.');
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
          setCheckoutMsg(
            data.status === 'trialing'
              ? 'Trial started — you will not be charged until it ends.'
              : 'Subscription activated. Welcome back.',
          );
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

  const openInitiative = (id, tab = 'details') => {
    setInitiativeFocusId(id);
    setInitiativeFocusTab(tab);
    setSection('initiatives');
  };

  const openFromSchedule = useCallback((target) => {
    if (!target?.type) return;
    if (target.type === 'program') {
      setProgramFocusId(target.id);
      setSection('program');
      return;
    }
    if (target.type === 'initiative') {
      setInitiativeFocusId(target.id);
      setInitiativeFocusTab('details');
      setSection('initiatives');
      return;
    }
    if (target.type === 'task') {
      setTaskFocusId(target.id);
      setSection('tasks');
      return;
    }
    if (target.type === 'hypercare' && target.initiativeId) {
      setInitiativeFocusId(target.initiativeId);
      setInitiativeFocusTab('hypercare');
      setSection('initiatives');
    }
  }, []);

  const handleNavigate = useCallback((target) => {
    if (!target?.section) return;
    setSection(target.section);
    if (target.initiativeId) {
      setInitiativeFocusId(target.initiativeId);
      setInitiativeFocusTab(target.initTab || 'details');
    }
    if (target.adminTab) setAdminTabFocus(target.adminTab);
    else if (target.section !== 'settings') setAdminTabFocus(null);
  }, []);

  const openUpgradePlan = useCallback(() => {
    setProfileUpgradeOpen(true);
    setSection('profile');
  }, []);

  let body = null;
  if (section === 'dashboard') {
    body = <Dashboard onOpenInitiative={openInitiative} onUpgrade={openUpgradePlan} />;
  } else if (section === 'program') {
    body = (
      <ProgramsPanel
        initialProgramId={programFocusId}
        onProgramFocusConsumed={() => setProgramFocusId(null)}
      />
    );
  } else if (section === 'initiatives') {
    body = (
      <InitiativesPanel
        initialSelectedId={initiativeFocusId}
        initialTab={initiativeFocusTab}
        onSelectedConsumed={() => {
          setInitiativeFocusId(null);
          setInitiativeFocusTab(null);
        }}
      />
    );
  } else if (section === 'requirements') body = <RequirementsPanel />;
  else if (section === 'tasks') {
    body = featuresUnlocked
      ? (
        <TasksPanel
          initialTaskId={taskFocusId}
          onTaskFocusConsumed={() => setTaskFocusId(null)}
        />
      )
      : (
        <UpgradePrompt
          feature="Tasks"
          onUpgrade={openUpgradePlan}
        />
      );
  } else if (section === 'schedule') {
    body = featuresUnlocked
      ? <SchedulePanel onOpenRecord={openFromSchedule} />
      : (
        <UpgradePrompt
          feature="Schedule"
          onUpgrade={openUpgradePlan}
        />
      );
  } else if (section === 'reports') {
    body = <ReportsPanel onUpgrade={openUpgradePlan} />;
  } else if (section === 'users') {
    if (!featuresUnlocked) {
      body = (
        <UpgradePrompt
          feature="Users"
          title="Multi-user access requires a paid plan"
          body={(
            <>
              {PLAN_LABELS.solo} is single-user. Upgrade to {PLAN_LABELS.small} or {PLAN_LABELS.enterprise} to invite
              colleagues and assign them to workspaces.
            </>
          )}
          onUpgrade={openUpgradePlan}
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
  } else if (section === 'profile') {
    body = (
      <ProfilePanel
        initialUpgradeOpen={profileUpgradeOpen}
        onUpgradeOpenConsumed={() => setProfileUpgradeOpen(false)}
      />
    );
  } else if (section === 'settings') {
    body = (
      <SystemAdmin
        initialTab={adminTabFocus}
        onInitialTabConsumed={() => setAdminTabFocus(null)}
        initialOpenAddOrg={openAddOrg}
        onInitialOpenAddOrgConsumed={() => setOpenAddOrg(false)}
        requireOrg={!tourPending && needsOrgSetup}
        onOrgCreated={markOrgSetupComplete}
      />
    );
  }

  // Wait until subscription fetch finishes — needsCheckout(null) is true both while
  // loading and when checkout is genuinely required; only trust it after load.
  const showIncompleteGate = !workspaceLoading && isOwner && checkoutNeeded && !pastDue;
  const showPastDueGate = !workspaceLoading && isOwner && pastDue;
  const showOnboardingTour = !workspaceLoading && tourPending && orgCheckDone;

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ ...BODY, background: C.bg }}>
      {showIncompleteGate && <BillingGate mode="incomplete" />}
      {showPastDueGate && <BillingGate mode="past_due" />}
      <TopNav onNavigate={handleNavigate} />
      {showOnboardingTour && (
        <OnboardingTour
          onNavigate={handleNavigate}
          needsOrgSetup={needsOrgSetup}
          onFinished={handleTourFinished}
        />
      )}
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

  // App access requires a confirmed email (checkout/signup may precede confirmation).
  if (!session.user?.email_confirmed_at) {
    const email = session.user?.email ? encodeURIComponent(session.user.email) : '';
    return <Navigate to={`/check-email${email ? `?email=${email}` : ''}`} replace />;
  }

  return (
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
  );
}
