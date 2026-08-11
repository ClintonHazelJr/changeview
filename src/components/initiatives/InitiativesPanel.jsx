import { useState } from 'react';
import {
  Building2, Plus, ChevronRight, ChevronLeft, LayoutGrid, FileText, AlertTriangle,
  Users, GraduationCap, MessageSquare,
} from 'lucide-react';
import { C, HEAD, BODY, tint, initials, SEVERITY_COLOR } from '../../lib/constants';
import { useInitiatives, useInitiativeDetail } from '../../hooks/useInitiatives';
import { useAdminData } from '../../hooks/useAdminData';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { TabSection } from '../ui/shared';
import Modal from '../ui/Modal';
import {
  FormInitiative, FormImpact, FormStakeholder, FormLearningNeed, FormComms,
} from '../forms/AdminForms';

export default function InitiativesPanel() {
  const { activeWorkspace } = useWorkspace();
  const { initiatives, addInitiative } = useInitiatives();
  const { orgs, departments, people } = useAdminData();
  const [selectedInitId, setSelectedInitId] = useState(null);
  const [initTab, setInitTab] = useState('details');
  const [modal, setModal] = useState(null);

  const detail = useInitiativeDetail(selectedInitId);
  const selectedInit = detail.initiative;

  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';
  const personName = (id) => people.find((p) => p.id === id)?.name || '—';
  const impactLabel = (id) => {
    const i = detail.impacts.find((x) => x.id === id);
    return i ? `${deptName(i.department_id)} impact` : '—';
  };

  const initData = {
    impacts: detail.impacts,
    stakeholders: detail.stakeholders,
    learningNeeds: detail.learningNeeds,
    comms: detail.comms,
  };

  const initTabs = [
    { key: 'details', label: 'Details', icon: FileText, color: C.purple },
    { key: 'impacts', label: 'Impacts', icon: AlertTriangle, color: C.coral, count: initData.impacts.length },
    { key: 'stakeholders', label: 'Stakeholders', icon: Users, color: C.teal, count: initData.stakeholders.length },
    { key: 'learning', label: 'Learning Needs', icon: GraduationCap, color: C.amber, count: initData.learningNeeds.length },
    { key: 'comms', label: 'Comms', icon: MessageSquare, color: C.green, count: initData.comms.length },
  ];

  if (!selectedInitId) {
    return (
      <div className="flex-1 p-8 max-w-4xl w-full mx-auto" style={BODY}>
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-xl font-extrabold" style={{ ...HEAD, color: C.ink }}>Initiatives — {activeWorkspace?.name}</h2>
          <button
            type="button"
            onClick={() => setModal('initiative')}
            disabled={orgs.length === 0}
            className="flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2.5 rounded-full disabled:opacity-40 shadow-sm"
            style={{ background: C.purple }}
          >
            <Plus size={15} /> Add Initiative
          </button>
        </div>
        <p className="text-sm mb-5" style={{ color: C.sub }}>
          {orgs.length === 0 ? 'Set up an Org in System Admin first.' : 'Pick one to open its Impacts, Stakeholders, Learning Needs, and Comms.'}
        </p>
        {initiatives.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: tint(C.purple, '16') }}><LayoutGrid size={20} style={{ color: C.purple }} /></div>
            <div className="text-sm" style={{ color: C.sub }}>No initiatives yet.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {initiatives.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => { setSelectedInitId(i.id); setInitTab('details'); }}
                className="bg-white rounded-2xl p-4 shadow-sm border text-left hover:shadow-md transition-shadow"
                style={{ borderColor: C.border }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: tint(C.purple, '18') }}><Building2 size={16} style={{ color: C.purple }} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{i.name}</div>
                    <div className="text-xs" style={{ color: C.sub }}>{i.status}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: C.sub }} />
                </div>
                <p className="text-xs line-clamp-2" style={{ color: C.sub }}>{i.description}</p>
              </button>
            ))}
          </div>
        )}
        {modal === 'initiative' && (
          <Modal title="Add Initiative" onClose={() => setModal(null)}>
            <FormInitiative
              people={people}
              onSave={async (vals) => {
                const data = await addInitiative(vals);
                setModal(null);
                setSelectedInitId(data.id);
                setInitTab('details');
              }}
            />
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1" style={BODY}>
      <div className="w-56 bg-white border-r flex flex-col py-5 px-3" style={{ borderColor: C.border }}>
        <button type="button" onClick={() => setSelectedInitId(null)} className="flex items-center gap-1.5 text-xs font-semibold mb-4 px-2" style={{ color: C.sub }}>
          <ChevronLeft size={14} /> All Initiatives
        </button>
        <div className="text-sm font-bold px-2 mb-4" style={{ ...HEAD, color: C.ink }}>{selectedInit?.name}</div>
        {initTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setInitTab(t.key)}
            className="flex items-center gap-2.5 pl-3 pr-2.5 py-2.5 rounded-r-xl text-sm text-left mb-1 border-l-4"
            style={{
              borderColor: initTab === t.key ? t.color : 'transparent',
              background: initTab === t.key ? tint(t.color, '10') : 'transparent',
              color: initTab === t.key ? C.ink : C.sub,
              fontWeight: initTab === t.key ? 700 : 500,
            }}
          >
            <t.icon size={15} style={{ color: initTab === t.key ? t.color : C.sub }} />
            {t.label}
            {t.count > 0 && (
              <span className="ml-auto text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ background: tint(t.color, '20'), color: t.color }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 p-8 max-w-4xl">
        {initTab === 'details' && selectedInit && (
          <div>
            <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>{selectedInit.name}</h2>
            <p className="text-sm mb-6" style={{ color: C.sub }}>{selectedInit.description}</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                ['Status', selectedInit.status],
                ['Go Live Date', selectedInit.proposed_go_live_date || '—'],
                ['Budget', selectedInit.budget ? `$${Number(selectedInit.budget).toLocaleString()}` : '—'],
                ['Change Owner', personName(selectedInit.change_owner_id) || '—'],
                ['Project Manager', personName(selectedInit.project_manager_id) || '—'],
              ].map(([label, val]) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: C.border }}>
                  <div className="text-[11px] font-semibold uppercase mb-1" style={{ color: C.sub }}>{label}</div>
                  <div className="text-sm font-bold capitalize" style={{ color: C.ink }}>{val}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border mb-3" style={{ borderColor: C.border }}>
              <div className="text-[11px] font-semibold uppercase mb-1" style={{ color: C.sub }}>Use Case</div>
              <div className="text-sm" style={{ color: C.ink }}>{selectedInit.use_case || '—'}</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: C.border }}>
              <div className="text-[11px] font-semibold uppercase mb-1" style={{ color: C.sub }}>Expected Benefits</div>
              <div className="text-sm" style={{ color: C.ink }}>{selectedInit.expected_benefits || '—'}</div>
            </div>
          </div>
        )}

        {initTab === 'impacts' && (
          <TabSection title="Impacts" subtitle="Scope who and what is affected by this change." onAdd={() => setModal('impact')} addLabel="Add Impact" color={C.coral} empty={initData.impacts.length === 0} emptyText="No impacts recorded yet." emptyIcon={AlertTriangle}>
            <div className="space-y-3">
              {initData.impacts.map((imp) => {
                const severity = {
                  org: imp.severity_org, people: imp.severity_people, process: imp.severity_process,
                  system: imp.severity_system, environment: imp.severity_environment,
                };
                return (
                  <div key={imp.id} className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: C.border }}>
                    <div className="text-sm font-bold mb-2" style={{ color: C.ink }}>{deptName(imp.department_id)} · {imp.headcount_impacted} impacted</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {Object.entries(severity).map(([k, v]) => v && (
                        <span key={k} className="text-[10px] font-semibold px-2 py-1 rounded-full capitalize" style={{ background: tint(SEVERITY_COLOR[v], '22'), color: SEVERITY_COLOR[v] }}>{k}: {v}</span>
                      ))}
                    </div>
                    <p className="text-xs mb-1" style={{ color: C.sub }}><b>Now:</b> {imp.current_state_process}</p>
                    <p className="text-xs" style={{ color: C.sub }}><b>Future:</b> {imp.future_state_process}</p>
                    <div className="flex gap-1.5 mt-2">{(imp.intervention_tags || []).map((t) => <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: tint(C.coral, '18'), color: C.coral }}>{t}</span>)}</div>
                  </div>
                );
              })}
            </div>
          </TabSection>
        )}

        {initTab === 'stakeholders' && (
          <TabSection title="Stakeholders" subtitle="Who's involved, and their RACI role on this Initiative." onAdd={() => setModal('stakeholder')} addLabel="Add Stakeholder" color={C.teal} disabled={people.length === 0} disabledText="Add People in System Admin first." empty={initData.stakeholders.length === 0} emptyText="No stakeholders added yet." emptyIcon={Users}>
            <div className="grid grid-cols-2 gap-3">
              {initData.stakeholders.map((s) => {
                const raci = { r: s.raci_responsible, a: s.raci_accountable, c: s.raci_consulted, i: s.raci_informed };
                return (
                  <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-3" style={{ borderColor: C.border }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: C.teal }}>{initials(personName(s.person_id))}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{personName(s.person_id)}</div>
                      <div className="text-xs truncate" style={{ color: C.sub }}>{s.project_role}</div>
                      <div className="flex gap-1 mt-1">{Object.entries(raci).filter(([, v]) => v).map(([k]) => <span key={k} className="text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center uppercase" style={{ background: tint(C.teal, '20'), color: C.teal }}>{k}</span>)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabSection>
        )}

        {initTab === 'learning' && (
          <TabSection title="Learning Needs" subtitle="Training required per Impact, feeds directly into the delivery plan." onAdd={() => setModal('learning')} addLabel="Add Learning Need" color={C.amber} disabled={initData.impacts.length === 0} disabledText="Add an Impact first." empty={initData.learningNeeds.length === 0} emptyText="No learning needs yet." emptyIcon={GraduationCap}>
            <div className="space-y-2">
              {initData.learningNeeds.map((ln) => (
                <div key={ln.id} className="bg-white rounded-2xl p-4 shadow-sm border flex items-center justify-between" style={{ borderColor: C.border }}>
                  <div>
                    <div className="text-sm font-bold" style={{ color: C.ink }}>{ln.team} <span className="font-normal text-xs" style={{ color: C.sub }}>· {impactLabel(ln.impact_id)}</span></div>
                    <div className="text-xs" style={{ color: C.sub }}>{ln.goal}</div>
                  </div>
                  <div className="text-right text-xs" style={{ color: C.sub }}>
                    <div className="font-semibold" style={{ color: C.amber }}>{ln.type}</div>
                    {ln.headcount} people · {ln.session_count} session · {ln.time_hours}h
                  </div>
                </div>
              ))}
            </div>
          </TabSection>
        )}

        {initTab === 'comms' && (
          <TabSection title="Comms" subtitle="Draft and save communications, generated with AI from your Impact data." onAdd={() => setModal('comms')} addLabel="Add Comms" color={C.green} empty={initData.comms.length === 0} emptyText="No comms drafted yet." emptyIcon={MessageSquare}>
            <div className="space-y-3">
              {initData.comms.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: C.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold" style={{ color: C.ink }}>{c.key_message || 'Untitled'}</span>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full capitalize" style={{ background: tint(C.green, '18'), color: '#1a8a5f' }}>{c.tone}</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: C.sub }}>
                    {c.impact_id ? impactLabel(c.impact_id) : 'Initiative-wide'} · {(c.channel || []).join(', ') || '—'}
                  </p>
                  {c.final_content && <p className="text-xs whitespace-pre-wrap" style={{ color: C.ink }}>{c.final_content}</p>}
                </div>
              ))}
            </div>
          </TabSection>
        )}
      </div>

      {modal === 'impact' && <Modal title="Add Impact" wide onClose={() => setModal(null)}><FormImpact departments={departments} onSave={async (v) => { await detail.addImpact(v); setModal(null); }} /></Modal>}
      {modal === 'stakeholder' && <Modal title="Add Stakeholder" onClose={() => setModal(null)}><FormStakeholder people={people} onSave={async (v) => { await detail.addStakeholder(v); setModal(null); }} /></Modal>}
      {modal === 'learning' && <Modal title="Add Learning Need" onClose={() => setModal(null)}><FormLearningNeed impacts={initData.impacts} deptName={deptName} onSave={async (v) => { await detail.addLearningNeed(v); setModal(null); }} /></Modal>}
      {modal === 'comms' && selectedInit && (
        <Modal title="Add Comms" wide onClose={() => setModal(null)}>
          <FormComms initiative={selectedInit} impacts={initData.impacts} deptName={deptName} onSave={async (v) => { await detail.addComms(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}
