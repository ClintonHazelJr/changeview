import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { C, HEAD, BODY } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

function buildSteps(needsOrgSetup) {
  return [
    {
      id: 'workspace',
      target: '[data-tour="workspace-picker"]',
      section: null,
      title: 'Your workspace',
      body: 'Switch Workspaces here. Each Workspace holds its own Orgs, Programs, and Initiatives — useful if you run more than one engagement.',
    },
    {
      id: 'admin',
      target: '[data-tour="nav-settings"]',
      section: 'settings',
      title: 'Start in System Admin',
      body: 'Setup begins here: add Orgs, Departments, People, and Project Teams. Do this once so Impacts, Stakeholders, and assignees are ready to reuse.',
    },
    {
      id: 'initiative',
      target: '[data-tour="add-initiative"]',
      section: 'initiatives',
      title: 'Add an Initiative',
      body: 'Initiatives are the units of change you run (under a Program). Create one to scope Impacts, Stakeholders, Learning Needs, and Comms.',
    },
    {
      id: 'comms',
      target: '[data-tour="nav-initiatives"]',
      section: 'initiatives',
      title: 'AI Comms Generator',
      body: 'Open any Initiative → Comms tab → AI Comms Generator. It drafts from your real Impact context (current state, future state, severity) — not generic filler. You edit and send; ChangeView never auto-sends.',
    },
    needsOrgSetup
      ? {
        id: 'add-org',
        target: '[data-tour="nav-settings"]',
        section: 'settings',
        title: 'Next: add your first Org',
        body: 'That is the loop conceptually. Your real next step is concrete: add an Organization (a client company or your own). Departments and People come right after.',
        finishLabel: 'Add your first Org',
      }
      : {
        id: 'done',
        target: null,
        section: null,
        title: "You're set",
        body: "That's the loop: set up once in System Admin, scope Impacts, draft Comms with AI, then track and report. Reopen this tour anytime from Profile.",
        finishLabel: 'Done',
      },
  ];
}

/**
 * Short first-run tour. Shown when profile.onboarding_completed_at is null.
 * Finish or Skip sets onboarding_completed_at = now(), then onFinished()
 * (used to open Add Org when the workspace still has none).
 */
export default function OnboardingTour({ onNavigate, onFinished, needsOrgSetup = false }) {
  const { profile, refreshProfile } = useAuth();
  const steps = useMemo(() => buildSteps(needsOrgSetup), [needsOrgSetup]);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [busy, setBusy] = useState(false);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  const complete = useCallback(async () => {
    if (!profile?.id || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      onFinished?.({ needsOrgSetup });
    } catch (err) {
      console.error('Could not save onboarding completion', err);
      await refreshProfile();
      onFinished?.({ needsOrgSetup });
    } finally {
      setBusy(false);
    }
  }, [profile?.id, busy, refreshProfile, onFinished, needsOrgSetup]);

  useEffect(() => {
    if (!step?.section || typeof onNavigate !== 'function') return undefined;
    onNavigate({ section: step.section });
    return undefined;
  }, [step?.id, step?.section, onNavigate]);

  useLayoutEffect(() => {
    if (!step?.target) {
      setRect(null);
      return undefined;
    }

    let cancelled = false;
    let tries = 0;

    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        });
        return;
      }
      setRect(null);
      if (tries < 12) {
        tries += 1;
        window.setTimeout(measure, 80);
      }
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step?.id, step?.target]);

  const pad = 8;
  const hole = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const tooltipStyle = (() => {
    if (!hole) {
      return {
        position: 'fixed',
        left: '50%',
        top: '42%',
        transform: 'translate(-50%, -50%)',
        width: 'min(360px, calc(100vw - 32px))',
      };
    }
    const below = hole.top + hole.height + 12;
    const spaceBelow = window.innerHeight - below;
    const top = spaceBelow < 200 ? Math.max(16, hole.top - 12 - 200) : below;
    const left = Math.min(
      Math.max(16, hole.left),
      window.innerWidth - 376,
    );
    return {
      position: 'fixed',
      top,
      left,
      width: 'min(360px, calc(100vw - 32px))',
    };
  })();

  const finishLabel = step.finishLabel || 'Done';

  return (
    <div className="fixed inset-0 z-[80]" style={{ ...BODY }} role="dialog" aria-modal="true" aria-label="Onboarding">
      {hole ? (
        <>
          <div className="fixed inset-0 bg-black/45 pointer-events-none" />
          <div
            className="fixed rounded-2xl pointer-events-none"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              border: `2px solid ${C.purple}`,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/45" />
      )}

      <div
        className="bg-white rounded-2xl shadow-2xl border p-5 z-[81]"
        style={{ ...tooltipStyle, borderColor: C.border }}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: C.sub }}>
              Step {stepIndex + 1} of {steps.length}
            </div>
            <h2 className="text-base font-extrabold" style={{ ...HEAD, color: C.ink }}>{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={complete}
            disabled={busy}
            className="p-1 rounded-lg shrink-0"
            style={{ color: C.sub }}
            aria-label="Dismiss tutorial"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm leading-relaxed mb-4" style={{ color: C.sub }}>{step.body}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={complete}
            disabled={busy}
            className="text-xs font-semibold px-2 py-1.5"
            style={{ color: C.sub }}
          >
            Skip tutorial
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="text-sm font-semibold px-3 py-2 rounded-full border"
                style={{ borderColor: C.border, color: C.ink }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (isLast) complete();
                else setStepIndex((i) => i + 1);
              }}
              className="text-sm font-bold text-white px-4 py-2 rounded-full disabled:opacity-50"
              style={{ background: C.purple }}
            >
              {isLast ? (busy ? 'Saving…' : finishLabel) : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
