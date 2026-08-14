import { useEffect, useState } from 'react';
import {
  Building2, MapPin, Users, UserCircle2, Plus, ChevronRight, Mail, Tag, UserCheck, UserX,
} from 'lucide-react';
import { C, HEAD, BODY, tint, initials, parseDbError } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAdminData } from '../../hooks/useAdminData';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { ListCard, TabSection } from '../ui/shared';
import ListTable from '../ui/ListTable';
import StatusPill from '../ui/StatusPill';
import Modal from '../ui/Modal';
import CsvImportModal from '../ui/CsvImportModal';
import { findByName } from '../../lib/csvImport';
import {
  FormOrg, FormDepartment, FormPerson, FormTeam, FormTeamMember,
} from '../forms/AdminForms';

export default function SystemAdmin({
  initialTab = null,
  onInitialTabConsumed,
  initialOpenAddOrg = false,
  onInitialOpenAddOrgConsumed,
}) {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const { profile } = useAuth();
  const {
    orgs, departments, people, teams,
    addOrg, addDepartment, updateDepartment, addPerson, updatePerson, setPersonActive, addTeam, addTeamMember, reload,
  } = useAdminData();
  const [adminTab, setAdminTab] = useState(initialTab || 'org');
  const [modal, setModal] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [busyPersonId, setBusyPersonId] = useState(null);
  const [bulk, setBulk] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [viewMode, setViewMode] = useState('tiles');
  const accountId = profile?.account_id;

  useEffect(() => {
    if (!initialTab) return;
    setAdminTab(initialTab);
    onInitialTabConsumed?.();
  }, [initialTab, onInitialTabConsumed]);

  useEffect(() => {
    if (!initialOpenAddOrg) return;
    setAdminTab('org');
    setModal('org');
    onInitialOpenAddOrgConsumed?.();
  }, [initialOpenAddOrg, onInitialOpenAddOrgConsumed]);

  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';
  const personName = (id) => people.find((p) => p.id === id)?.name || '—';
  const personIsActive = (p) => p.is_active !== false;
  const activePeople = people.filter(personIsActive);

  const openAddPerson = () => {
    setEditingPerson(null);
    setModal('people');
  };
  const openEditPerson = (p) => {
    setEditingPerson(p);
    setModal('people');
  };
  const closePersonModal = () => {
    setModal(null);
    setEditingPerson(null);
  };

  const openAddDepartment = () => {
    setEditingDepartment(null);
    setModal('department');
  };
  const openEditDepartment = (d) => {
    setEditingDepartment(d);
    setModal('department');
  };
  const closeDepartmentModal = () => {
    setModal(null);
    setEditingDepartment(null);
  };

  const togglePersonActive = async (p) => {
    const next = !personIsActive(p);
    if (!next && !window.confirm(`Deactivate ${p.name}? They will no longer appear in assign-to pickers.`)) return;
    setBusyPersonId(p.id);
    try {
      await setPersonActive(p.id, next);
    } catch (err) {
      alert(err.message || 'Could not update person');
    } finally {
      setBusyPersonId(null);
    }
  };

  const adminSteps = [
    { key: 'org', label: 'Org', icon: Building2, color: C.purple, count: orgs.length },
    { key: 'department', label: 'Department', icon: MapPin, color: C.teal, count: departments.length },
    { key: 'people', label: 'People', icon: UserCircle2, color: C.coral, count: people.length },
    { key: 'teams', label: 'Project Teams', icon: Users, color: C.green, count: teams.length },
  ];

  return (
    <div className="flex flex-1" style={BODY}>
      <div className="w-56 bg-white border-r flex flex-col py-5 px-3" style={{ borderColor: C.border }}>
        <div className="px-3 mb-4">
          <div className="text-[11px] font-bold tracking-wide uppercase mb-1" style={{ color: C.sub }}>System Admin</div>
          <div className="text-xs" style={{ color: C.sub }}>{adminSteps.filter((s) => s.count > 0).length} of 4 set up</div>
          <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: C.border }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(adminSteps.filter((s) => s.count > 0).length / 4) * 100}%`, background: C.teal }} />
          </div>
        </div>
        {adminSteps.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setAdminTab(s.key)}
            className="flex items-center gap-2.5 pl-3 pr-2.5 py-2.5 rounded-r-xl text-sm text-left mb-1 border-l-4"
            style={{
              borderColor: adminTab === s.key ? s.color : 'transparent',
              background: adminTab === s.key ? tint(s.color, '10') : 'transparent',
              color: adminTab === s.key ? C.ink : C.sub,
              fontWeight: adminTab === s.key ? 700 : 500,
            }}
          >
            <s.icon size={15} style={{ color: adminTab === s.key ? s.color : C.sub }} />
            {s.label}
            {s.count > 0 && (
              <span className="ml-auto text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ background: tint(s.color, '20'), color: s.color }}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 p-8 max-w-4xl">
        {adminSteps.filter((s) => s.count > 0).length === 0 && (
          <div className="rounded-3xl p-7 mb-6" style={{ background: `linear-gradient(120deg, ${tint(C.purple, '12')}, ${tint(C.teal, '10')})` }}>
            <div className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Welcome to {activeWorkspace?.name}</div>
            <p className="text-sm max-w-md" style={{ color: C.sub }}>Set up your Org, Department, People, and Project Teams, in that order, then create a Program and Initiatives.</p>
          </div>
        )}
        <div className="grid grid-cols-4 gap-3 mb-7">
          {adminSteps.map((s) => (
            <div key={s.key} className="rounded-3xl p-4 text-white relative overflow-hidden" style={{ background: s.color }}>
              <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center mb-3"><s.icon size={15} /></div>
              <div className="text-2xl font-extrabold" style={HEAD}>{s.count}</div>
              <div className="text-xs font-medium opacity-90">{s.label}</div>
            </div>
          ))}
        </div>

        {adminTab === 'org' && (
          <TabSection
            title="Org"
            subtitle={`Add each client company you'll run change work for inside ${activeWorkspace?.name}.`}
            onAdd={() => setModal('org')}
            addLabel="Add Org"
            color={C.purple}
            empty={orgs.length === 0}
            emptyText="No orgs yet. Add your first company to get started."
            emptyIcon={Building2}
            viewMode={viewMode}
            onViewChange={setViewMode}
          >
            {viewMode === 'list' ? (
              <ListTable
                columns={[
                  { key: 'name', label: 'Name', sortable: true, render: (c) => <span className="font-semibold">{c.name}</span> },
                  { key: 'type', label: 'Type', render: () => 'Company' },
                ]}
                rows={orgs}
                initialSortKey="name"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">{orgs.map((c) => <ListCard key={c.id} icon={Building2} color={C.purple} title={c.name} subtitle="Company" />)}</div>
            )}
          </TabSection>
        )}
        {adminTab === 'department' && (
          <TabSection
            title="Department"
            subtitle="Departments sit under an Org and tag who's impacted on every Impact record."
            onAdd={openAddDepartment}
            addLabel="Add Department"
            onBulkUpload={() => setBulk('departments')}
            color={C.teal}
            disabled={orgs.length === 0}
            disabledText="Add an Org first."
            empty={departments.length === 0}
            emptyText="No departments yet."
            emptyIcon={MapPin}
            viewMode={viewMode}
            onViewChange={setViewMode}
          >
            {viewMode === 'list' ? (
              <ListTable
                columns={[
                  { key: 'name', label: 'Name', sortable: true, render: (d) => <span className="font-semibold">{d.name}</span> },
                  {
                    key: 'org',
                    label: 'Org',
                    sortable: true,
                    sortValue: (d) => orgs.find((c) => c.id === d.org_id)?.name || '',
                    render: (d) => orgs.find((c) => c.id === d.org_id)?.name || '—',
                  },
                  { key: 'location', label: 'Location', sortable: true, render: (d) => d.location || '—' },
                ]}
                rows={departments}
                onRowClick={openEditDepartment}
                initialSortKey="name"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {departments.map((d) => (
                  <ListCard
                    key={d.id}
                    icon={MapPin}
                    color={C.teal}
                    title={d.name}
                    subtitle={orgs.find((c) => c.id === d.org_id)?.name}
                    tag={d.location}
                    onClick={() => openEditDepartment(d)}
                  />
                ))}
              </div>
            )}
          </TabSection>
        )}
        {adminTab === 'people' && (
          <TabSection
            title="People"
            subtitle="Your directory. Add someone once here, then reuse them as a Stakeholder or Team Member on any Initiative."
            onAdd={openAddPerson}
            addLabel="Add Person"
            onBulkUpload={() => setBulk('people')}
            color={C.coral}
            disabled={departments.length === 0}
            disabledText="Add a Department first."
            empty={people.length === 0}
            emptyText="No people yet."
            emptyIcon={UserCircle2}
            viewMode={viewMode}
            onViewChange={setViewMode}
          >
            {viewMode === 'list' ? (
              <ListTable
                columns={[
                  { key: 'name', label: 'Name', sortable: true, render: (p) => <span className="font-semibold">{p.name}</span> },
                  { key: 'title', label: 'Title', sortable: true, render: (p) => p.title || '—' },
                  {
                    key: 'department',
                    label: 'Department',
                    sortable: true,
                    sortValue: (p) => deptName(p.department_id),
                    render: (p) => deptName(p.department_id),
                  },
                  { key: 'email', label: 'Email', sortable: true, render: (p) => p.email || '—' },
                  {
                    key: 'is_active',
                    label: 'Status',
                    sortable: true,
                    sortValue: (p) => (personIsActive(p) ? 1 : 0),
                    render: (p) => (
                      <StatusPill
                        label={personIsActive(p) ? 'Active' : 'Inactive'}
                        color={personIsActive(p) ? C.green : C.sub}
                      />
                    ),
                  },
                  {
                    key: 'actions',
                    label: '',
                    render: (p) => (
                      <button
                        type="button"
                        disabled={busyPersonId === p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePersonActive(p);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full disabled:opacity-50"
                        style={{
                          background: personIsActive(p) ? tint(C.coral, '18') : tint(C.green, '18'),
                          color: personIsActive(p) ? C.coral : C.green,
                        }}
                      >
                        {personIsActive(p) ? <UserX size={12} /> : <UserCheck size={12} />}
                        {busyPersonId === p.id ? '…' : personIsActive(p) ? 'Deactivate' : 'Reactivate'}
                      </button>
                    ),
                  },
                ]}
                rows={people}
                onRowClick={openEditPerson}
                initialSortKey="name"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {people.map((p) => {
                  const inactive = !personIsActive(p);
                  const busy = busyPersonId === p.id;
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl p-4 shadow-sm border flex items-start gap-3"
                      style={{
                        borderColor: C.border,
                        opacity: inactive ? 0.72 : 1,
                        background: inactive ? tint(C.sub, '08') : '#fff',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEditPerson(p)}
                        className="flex items-start gap-3 min-w-0 flex-1 text-left"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: inactive ? C.sub : C.coral }}
                        >
                          {initials(p.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <div className="text-sm font-bold truncate" style={{ color: inactive ? C.sub : C.ink }}>{p.name}</div>
                            <StatusPill
                              label={inactive ? 'Inactive' : 'Active'}
                              color={inactive ? C.sub : C.green}
                            />
                          </div>
                          <div className="text-xs truncate" style={{ color: C.sub }}>{p.title || '—'} · {deptName(p.department_id)}</div>
                          {p.email && <div className="flex items-center gap-1 text-xs mt-1 truncate" style={{ color: C.sub }}><Mail size={11} />{p.email}</div>}
                        </div>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => togglePersonActive(p)}
                        className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0 disabled:opacity-50"
                        style={{
                          background: inactive ? tint(C.green, '18') : tint(C.coral, '18'),
                          color: inactive ? C.green : C.coral,
                        }}
                      >
                        {inactive ? <UserCheck size={12} /> : <UserX size={12} />}
                        {busy ? '…' : inactive ? 'Reactivate' : 'Deactivate'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabSection>
        )}
        {adminTab === 'teams' && (
          <TabSection
            title="Project Teams"
            subtitle="Group People into a team, so you can assign a whole team to an Initiative in one go."
            onAdd={() => setModal('team')}
            addLabel="Add Project Team"
            color={C.green}
            disabled={activePeople.length === 0}
            disabledText="Add at least one active Person first."
            empty={teams.length === 0}
            emptyText="No project teams yet."
            emptyIcon={Users}
            viewMode={viewMode}
            onViewChange={setViewMode}
          >
            {viewMode === 'list' ? (
              <div className="space-y-3">
                <ListTable
                  columns={[
                    { key: 'name', label: 'Team', sortable: true, render: (t) => <span className="font-semibold">{t.name}</span> },
                    {
                      key: 'members',
                      label: 'Members',
                      sortable: true,
                      sortValue: (t) => t.members.length,
                      render: (t) => `${t.members.length} member${t.members.length !== 1 ? 's' : ''}`,
                    },
                  ]}
                  rows={teams}
                  onRowClick={(t) => setExpandedTeam(expandedTeam === t.id ? null : t.id)}
                  initialSortKey="name"
                />
                {expandedTeam && (() => {
                  const t = teams.find((x) => x.id === expandedTeam);
                  if (!t) return null;
                  return (
                    <div className="bg-white rounded-2xl border p-4" style={{ borderColor: C.border }}>
                      <div className="text-sm font-bold mb-2" style={{ color: C.ink }}>{t.name} · members</div>
                      {t.members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-sm py-2">
                          <span style={{ color: C.ink }}>{personName(m.person_id)}</span>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: tint(C.navy, '18'), color: C.navy }}><Tag size={10} className="inline mr-1" />{m.role}</span>
                        </div>
                      ))}
                      <button type="button" onClick={() => setModal({ type: 'teamMember', teamId: t.id })} className="flex items-center gap-1.5 text-xs font-bold mt-2" style={{ color: C.purple }}><Plus size={13} /> Add team member</button>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((t) => (
                  <div key={t.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: C.border }}>
                    <button type="button" onClick={() => setExpandedTeam(expandedTeam === t.id ? null : t.id)} className="w-full flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: tint(C.green, '20') }}><Users size={14} style={{ color: C.green }} /></div>
                        <span className="text-sm font-bold" style={{ color: C.ink }}>{t.name}</span>
                      </div>
                      <span className="flex items-center gap-2 text-xs" style={{ color: C.sub }}>
                        {t.members.length} member{t.members.length !== 1 ? 's' : ''}
                        <ChevronRight size={14} className="transition-transform" style={{ transform: expandedTeam === t.id ? 'rotate(90deg)' : 'none' }} />
                      </span>
                    </button>
                    {expandedTeam === t.id && (
                      <div className="px-4 py-3" style={{ background: C.bg }}>
                        {t.members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between text-sm py-2">
                            <span style={{ color: C.ink }}>{personName(m.person_id)}</span>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: tint(C.navy, '18'), color: C.navy }}><Tag size={10} className="inline mr-1" />{m.role}</span>
                          </div>
                        ))}
                        <button type="button" onClick={() => setModal({ type: 'teamMember', teamId: t.id })} className="flex items-center gap-1.5 text-xs font-bold mt-2" style={{ color: C.purple }}><Plus size={13} /> Add team member</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabSection>
        )}
      </div>

      {modal === 'org' && <Modal title="Add Org" onClose={() => setModal(null)}><FormOrg onSave={async (n) => { await addOrg(n); setModal(null); }} /></Modal>}
      {modal === 'department' && (
        <Modal title={editingDepartment ? 'Edit Department' : 'Add Department'} onClose={closeDepartmentModal}>
          <FormDepartment
            orgs={orgs}
            initial={editingDepartment}
            onSave={async (d) => {
              if (editingDepartment) await updateDepartment(editingDepartment.id, d);
              else await addDepartment(d);
              closeDepartmentModal();
            }}
          />
        </Modal>
      )}
      {modal === 'people' && (
        <Modal title={editingPerson ? 'Edit Person' : 'Add Person'} onClose={closePersonModal}>
          <FormPerson
            departments={departments}
            initial={editingPerson}
            onSave={async (p) => {
              if (editingPerson) await updatePerson(editingPerson.id, p);
              else await addPerson(p);
              closePersonModal();
            }}
          />
        </Modal>
      )}
      {modal === 'team' && <Modal title="Add Project Team" onClose={() => setModal(null)}><FormTeam onSave={async (n) => { await addTeam(n); setModal(null); }} /></Modal>}
      {modal?.type === 'teamMember' && (
        <Modal title="Add Team Member" onClose={() => setModal(null)}>
          <FormTeamMember
            people={activePeople}
            departments={departments}
            onSave={async (personId, role) => { await addTeamMember(modal.teamId, personId, role); setModal(null); }}
          />
        </Modal>
      )}

      {bulk === 'departments' && (
        <CsvImportModal
          title="Bulk Upload Departments"
          headers={['Org', 'Department', 'Location']}
          exampleRow={{ Org: 'Acme Corp', Department: 'Operations', Location: 'Sydney' }}
          templateFilename="departments-template.csv"
          onClose={() => setBulk(null)}
          onComplete={async () => { await reload(); }}
          mapRow={(row) => {
            const orgName = row.Org;
            const name = row.Department;
            const location = row.Location || null;
            if (!name) throw new Error('Department name is required');
            if (!orgName) throw new Error('Org is required');
            const org = findByName(orgs, orgName);
            if (!org) throw new Error(`Org '${orgName}' not found`);
            if (org.ambiguous) throw new Error(`Multiple orgs named '${orgName}'`);
            return { orgId: org.id, name, location };
          }}
          importRow={async (vals) => {
            const { error } = await supabase.from('departments').insert({
              account_id: accountId,
              workspace_id: activeWorkspaceId,
              org_id: vals.orgId,
              name: vals.name,
              location: vals.location,
            });
            if (error) throw new Error(parseDbError(error));
          }}
        />
      )}

      {bulk === 'people' && (
        <CsvImportModal
          title="Bulk Upload People"
          headers={['Name', 'Department', 'Title', 'Email']}
          exampleRow={{
            Name: 'Alex Rivera',
            Department: 'Operations',
            Title: 'Change Lead',
            Email: 'alex@example.com',
          }}
          templateFilename="people-template.csv"
          onClose={() => setBulk(null)}
          onComplete={async () => { await reload(); }}
          mapRow={(row) => {
            const name = row.Name;
            const deptNameVal = row.Department;
            if (!name) throw new Error('Name is required');
            if (!deptNameVal) throw new Error('Department is required');
            const dept = findByName(departments, deptNameVal);
            if (!dept) throw new Error(`Department '${deptNameVal}' not found`);
            if (dept.ambiguous) throw new Error(`Multiple departments named '${deptNameVal}'`);
            return {
              name,
              departmentId: dept.id,
              title: row.Title || null,
              email: row.Email || null,
            };
          }}
          importRow={async (vals) => {
            const { error } = await supabase.from('people').insert({
              account_id: accountId,
              workspace_id: activeWorkspaceId,
              department_id: vals.departmentId,
              name: vals.name,
              title: vals.title,
              email: vals.email,
              is_active: true,
            });
            if (error) throw new Error(parseDbError(error));
          }}
        />
      )}
    </div>
  );
}
