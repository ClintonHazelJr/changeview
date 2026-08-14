import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, FileText, AlertTriangle, Users, GraduationCap, MessageSquare,
  CircleDot, Rocket, HeartPulse, CheckCircle2,
} from 'lucide-react';
import { C, HEAD, BODY, tint, initials, SEVERITY_COLOR, STATUS_COLOR, isRatedSeverity, parseInitiativeMeta } from '../../lib/constants';
import { useInitiatives, useInitiativeDetail } from '../../hooks/useInitiatives';
import { useAdminData } from '../../hooks/useAdminData';
import { TabSection } from '../ui/shared';
import Modal from '../ui/Modal';
import {
  FormInitiative, FormImpact, FormStakeholder, FormLearningNeed, FormComms, FormHypercare,
} from '../forms/AdminForms';
import ListTable from '../ui/ListTable';
import StatusPill from '../ui/StatusPill';
import {
  ListPageShell, ListTopBar, StatusFilterRow, GroupSection, CompactListCard,
  ListBody, countByStatus, statusColor,
} from '../ui/ListChrome';

const INIT_STATUSES = [
  { key: 'planning', label: 'Planning', icon: CircleDot },
  { key: 'delivery', label: 'Delivery', icon: Rocket },
  { key: 'hypercare', label: 'Hypercare', icon: HeartPulse },
  { key: 'closed', label: 'Closed', icon: CheckCircle2 },
];

function formatDate(value) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function InitiativesPanel({ initialSelectedId = null, onSelectedConsumed }) {
  const { initiatives, programs, addInitiative, reload: reloadInitiatives } = useInitiatives();
  const { departments, people } = useAdminData();
  const [selectedInitId, setSelectedInitId] = useState(initialSelectedId);
  const [initTab, setInitTab] = useState('details');
  const [modal, setModal] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [viewMode, setViewMode] = useState('tiles');

  const openCreate = (type) => {
    setEditingRecord(null);
    setModal(type);
  };
  const openEdit = (type, record) => {
    setEditingRecord(record);
    setModal(type);
  };
  const closeModal = () => {
    setModal(null);
    setEditingRecord(null);
  };

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedInitId(initialSelectedId);
      setInitTab('details');
      onSelectedConsumed?.();
    }
  }, [initialSelectedId, onSelectedConsumed]);

  const detail = useInitiativeDetail(selectedInitId);
  const selectedInit = detail.initiative;
  const programName = (id) => programs.find((p) => p.id === id)?.name || 'No Program';

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
    hypercare: detail.hypercare,
  };

  const initTabs = [
    { key: 'details', label: 'Details', icon: FileText, color: C.purple },
    { key: 'impacts', label: 'Impacts', icon: AlertTriangle, color: C.coral, count: initData.impacts.length },
    { key: 'stakeholders', label: 'Stakeholders', icon: Users, color: C.teal, count: initData.stakeholders.length },
    { key: 'learning', label: 'Learning Needs', icon: GraduationCap, color: C.amber, count: initData.learningNeeds.length },
    { key: 'comms', label: 'Comms', icon: MessageSquare, color: C.green, count: initData.comms.length },
    {
      key: 'hypercare',
      label: 'Hypercare',
      icon: HeartPulse,
      color: C.amber,
      highlight: selectedInit?.status === 'hypercare',
    },
  ];

  const getStatus = (i) => i.status || 'planning';
  const counts = countByStatus(initiatives, getStatus, INIT_STATUSES.map((s) => s.key));
  const filtered = useMemo(
    () => (statusFilter ? initiatives.filter((i) => getStatus(i) === statusFilter) : initiatives),
    [initiatives, statusFilter],
  );
  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((i) => {
      const key = i.program_id || 'none';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(i);
    });
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: key === 'none' ? 'No Program' : programName(key),
      items,
    }));
  }, [filtered, programs]);

  if (!selectedInitId) {
    const columns = [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        render: (i) => <span className="font-semibold">{i.name}</span>,
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        sortValue: (i) => getStatus(i),
        render: (i) => <StatusPill label={getStatus(i)} color={statusColor(getStatus(i))} />,
      },
      {
        key: 'program',
        label: 'Program',
        sortable: true,
        sortValue: (i) => programName(i.program_id),
        render: (i) => programName(i.program_id),
      },
      {
        key: 'proposed_go_live_date',
        label: 'Go live',
        sortable: true,
        render: (i) => formatDate(i.proposed_go_live_date) || '—',
      },
    ];

    return (
      <ListPageShell>
        <ListTopBar
          title="Initiatives"
          addLabel="Add Initiative"
          onAdd={() => setModal('initiative')}
          addDisabled={programs.length === 0}
          viewMode={viewMode}
          onViewChange={setViewMode}
        />
        <StatusFilterRow
          statuses={INIT_STATUSES}
          counts={counts}
          active={statusFilter}
          onSelect={setStatusFilter}
          onAddStatus={programs.length ? () => setModal('initiative') : undefined}
        />
        <ListBody
          empty={filtered.length === 0}
          emptyText={programs.length === 0 ? 'Create a Program first, then add Initiatives.' : 'No initiatives yet.'}
        >
          {viewMode === 'list' ? (
            <ListTable
              columns={columns}
              rows={filtered}
              onRowClick={(i) => { setSelectedInitId(i.id); setInitTab('details'); }}
              initialSortKey="name"
            />
          ) : (
            groups.map((g) => (
              <GroupSection
                key={g.key}
                title={g.label}
                items={g.items}
                getStatus={getStatus}
                addLabel="Add Initiative"
                onAdd={programs.length ? () => setModal('initiative') : undefined}
              >
                {g.items.map((i) => {
                  const meta = parseInitiativeMeta(i.description);
                  return (
                    <CompactListCard
                      key={i.id}
                      title={i.name}
                      subtitle={formatDate(i.proposed_go_live_date) ? `Go live ${formatDate(i.proposed_go_live_date)}` : 'No go-live date'}
                      tags={[{ label: getStatus(i), color: statusColor(getStatus(i)) }]}
                      avatars={[meta.changeOwner, meta.productOwner, meta.businessOwner, meta.projectManager].filter(Boolean)}
                      onClick={() => { setSelectedInitId(i.id); setInitTab('details'); }}
                    />
                  );
                })}
              </GroupSection>
            ))
          )}
        </ListBody>
        {modal === 'initiative' && (
          <Modal title="Add Initiative" onClose={() => setModal(null)}>
            <FormInitiative
              onSave={async (vals) => {
                const data = await addInitiative(vals);
                setModal(null);
                setSelectedInitId(data.id);
                setInitTab('details');
              }}
            />
          </Modal>
        )}
      </ListPageShell>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={BODY}>
      <div className="w-56 bg-white border-r flex flex-col py-5 px-3 shrink-0 overflow-y-auto" style={{ borderColor: C.border }}>
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
            {t.highlight && !t.count && (
              <span
                className="ml-auto w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: t.color }}
                title="Initiative is in Hypercare"
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 p-8 max-w-4xl overflow-y-auto">
        {initTab === 'details' && selectedInit && (() => {
          const meta = parseInitiativeMeta(selectedInit.description);
          return (
          <div>
            <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>{selectedInit.name}</h2>
            <p className="text-sm mb-6" style={{ color: C.sub }}>{meta.description || '—'}</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                ['Status', selectedInit.status],
                ['Program', programName(selectedInit.program_id)],
                ['Go Live Date', selectedInit.proposed_go_live_date || '—'],
                ['Budget', selectedInit.budget ? `$${Number(selectedInit.budget).toLocaleString()}` : '—'],
                ['Change Owner', meta.changeOwner || '—'],
                ['Product Owner', meta.productOwner || '—'],
                ['Business Owner', meta.businessOwner || '—'],
                ['Project Manager', meta.projectManager || '—'],
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
          );
        })()}

        {initTab === 'impacts' && (
          <TabSection title="Impacts" subtitle="Scope who and what is affected by this change." onAdd={() => openCreate('impact')} addLabel="Add Impact" color={C.coral} empty={initData.impacts.length === 0} emptyText="No impacts recorded yet." emptyIcon={AlertTriangle}>
            <div className="space-y-3">
              {initData.impacts.map((imp) => {
                const severity = {
                  org: imp.severity_org, people: imp.severity_people, process: imp.severity_process,
                  system: imp.severity_system, environment: imp.severity_environment,
                };
                return (
                  <button
                    key={imp.id}
                    type="button"
                    onClick={() => openEdit('impact', imp)}
                    className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow"
                    style={{ borderColor: C.border }}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="text-sm font-bold" style={{ color: C.ink }}>{deptName(imp.department_id)} · {imp.headcount_impacted} impacted</div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{
                          background: tint(STATUS_COLOR[imp.status || 'draft'], '22'),
                          color: STATUS_COLOR[imp.status || 'draft'],
                        }}
                      >
                        {imp.status || 'draft'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {Object.entries(severity).map(([k, v]) => isRatedSeverity(v) && (
                        <span key={k} className="text-[10px] font-semibold px-2 py-1 rounded-full capitalize" style={{ background: tint(SEVERITY_COLOR[v], '22'), color: SEVERITY_COLOR[v] }}>{k}: {v}</span>
                      ))}
                    </div>
                    <p className="text-xs mb-1" style={{ color: C.sub }}><b>Now:</b> {imp.current_state_process}</p>
                    <p className="text-xs" style={{ color: C.sub }}><b>Future:</b> {imp.future_state_process}</p>
                    <div className="flex gap-1.5 mt-2">{(imp.intervention_tags || []).map((t) => <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: tint(C.coral, '18'), color: C.coral }}>{t}</span>)}</div>
                  </button>
                );
              })}
            </div>
          </TabSection>
        )}

        {initTab === 'stakeholders' && (
          <TabSection title="Stakeholders" subtitle="Who's involved, and their RACI role on this Initiative." onAdd={() => openCreate('stakeholder')} addLabel="Add Stakeholder" color={C.teal} disabled={people.length === 0} disabledText="Add People in Settings first." empty={initData.stakeholders.length === 0} emptyText="No stakeholders added yet." emptyIcon={Users}>
            <div className="grid grid-cols-2 gap-3">
              {initData.stakeholders.map((s) => {
                const raci = { r: s.raci_responsible, a: s.raci_accountable, c: s.raci_consulted, i: s.raci_informed };
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openEdit('stakeholder', s)}
                    className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-3 hover:shadow-md transition-shadow"
                    style={{ borderColor: C.border }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: C.teal }}>{initials(personName(s.person_id))}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{personName(s.person_id)}</div>
                      <div className="text-xs truncate" style={{ color: C.sub }}>{s.project_role}</div>
                      <div className="flex gap-1 mt-1">{Object.entries(raci).filter(([, v]) => v).map(([k]) => <span key={k} className="text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center uppercase" style={{ background: tint(C.teal, '20'), color: C.teal }}>{k}</span>)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabSection>
        )}

        {initTab === 'learning' && (
          <TabSection title="Learning Needs" subtitle="Training required per Impact, feeds directly into the delivery plan." onAdd={() => openCreate('learning')} addLabel="Add Learning Need" color={C.amber} disabled={initData.impacts.length === 0} disabledText="Add an Impact first." empty={initData.learningNeeds.length === 0} emptyText="No learning needs yet." emptyIcon={GraduationCap}>
            <div className="space-y-2">
              {initData.learningNeeds.map((ln) => (
                <button
                  key={ln.id}
                  type="button"
                  onClick={() => openEdit('learning', ln)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border flex items-center justify-between hover:shadow-md transition-shadow"
                  style={{ borderColor: C.border }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <div className="text-sm font-bold" style={{ color: C.ink }}>{ln.team} <span className="font-normal text-xs" style={{ color: C.sub }}>· {impactLabel(ln.impact_id)}</span></div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{
                          background: tint(STATUS_COLOR[ln.status || 'draft'], '22'),
                          color: STATUS_COLOR[ln.status || 'draft'],
                        }}
                      >
                        {ln.status || 'draft'}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: C.sub }}>{ln.goal}</div>
                  </div>
                  <div className="text-right text-xs shrink-0" style={{ color: C.sub }}>
                    <div className="font-semibold" style={{ color: C.amber }}>{ln.type}</div>
                    {ln.headcount} people · {ln.session_count} session · {ln.time_hours}h
                  </div>
                </button>
              ))}
            </div>
          </TabSection>
        )}

        {initTab === 'hypercare' && selectedInit && (
          <div>
            <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Hypercare</h2>
            <p className="text-sm mb-5" style={{ color: C.sub }}>
              One hypercare plan per Initiative — pilot criteria, assumptions, and go-live timing.
            </p>
            <div className="bg-white rounded-3xl border shadow-sm p-5 max-w-xl" style={{ borderColor: C.border }}>
              <FormHypercare
                initiative={selectedInit}
                hypercare={initData.hypercare}
                onSave={async (vals) => {
                  await detail.saveHypercare(vals);
                  await reloadInitiatives();
                }}
              />
            </div>
          </div>
        )}

        {initTab === 'comms' && (
          <TabSection title="Comms" subtitle="Draft and save communications, generated with AI from your Impact data." onAdd={() => openCreate('comms')} addLabel="Add Comms" color={C.green} empty={initData.comms.length === 0} emptyText="No comms drafted yet." emptyIcon={MessageSquare}>
            <div className="space-y-3">
              {initData.comms.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openEdit('comms', c)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow"
                  style={{ borderColor: C.border }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold" style={{ color: C.ink }}>{c.key_message || 'Untitled'}</span>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full capitalize" style={{ background: tint(C.navy, '18'), color: C.navy }}>{c.tone}</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: C.sub }}>
                    {c.impact_id ? impactLabel(c.impact_id) : 'Initiative-wide'} · {(c.channel || []).join(', ') || '—'}
                  </p>
                  {c.final_content && <p className="text-xs whitespace-pre-wrap" style={{ color: C.ink }}>{c.final_content}</p>}
                </button>
              ))}
            </div>
          </TabSection>
        )}
      </div>

      {modal === 'impact' && (
        <Modal title={editingRecord ? 'Edit Impact' : 'Add Impact'} wide onClose={closeModal}>
          <FormImpact
            departments={departments}
            initial={editingRecord}
            onSave={async (v) => (
              editingRecord
                ? detail.updateImpact(editingRecord.id, v)
                : detail.addImpact(v)
            )}
            onComplete={closeModal}
            onDelete={editingRecord ? async () => { await detail.deleteImpact(editingRecord.id); closeModal(); } : undefined}
          />
        </Modal>
      )}
      {modal === 'stakeholder' && (
        <Modal title={editingRecord ? 'Edit Stakeholder' : 'Add Stakeholder'} onClose={closeModal}>
          <FormStakeholder
            people={people}
            departments={departments}
            initial={editingRecord}
            onSave={async (v) => {
              if (editingRecord) await detail.updateStakeholder(editingRecord.id, v);
              else await detail.addStakeholder(v);
              closeModal();
            }}
            onDelete={editingRecord ? async () => { await detail.deleteStakeholder(editingRecord.id); closeModal(); } : undefined}
          />
        </Modal>
      )}
      {modal === 'learning' && (
        <Modal title={editingRecord ? 'Edit Learning Need' : 'Add Learning Need'} onClose={closeModal}>
          <FormLearningNeed
            impacts={initData.impacts}
            deptName={deptName}
            initial={editingRecord}
            onSave={async (v) => (
              editingRecord
                ? detail.updateLearningNeed(editingRecord.id, v)
                : detail.addLearningNeed(v)
            )}
            onComplete={closeModal}
            onDelete={editingRecord ? async () => { await detail.deleteLearningNeed(editingRecord.id); closeModal(); } : undefined}
          />
        </Modal>
      )}
      {modal === 'comms' && selectedInit && (
        <Modal title={editingRecord ? 'Edit Comms' : 'Add Comms'} wide onClose={closeModal}>
          <FormComms
            initiative={selectedInit}
            impacts={initData.impacts}
            deptName={deptName}
            initial={editingRecord}
            onSave={async (v) => {
              if (editingRecord) await detail.updateComms(editingRecord.id, v);
              else await detail.addComms(v);
              closeModal();
            }}
            onDelete={editingRecord ? async () => { await detail.deleteComms(editingRecord.id); closeModal(); } : undefined}
          />
        </Modal>
      )}
    </div>
  );
}
