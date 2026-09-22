import { useEffect, useState } from 'react';
import {
  Building2, MapPin, Users, UserCircle2, Plus, ChevronRight, Mail, Tag,
} from 'lucide-react';
import {
  C, HEAD, BODY, tint, initials, parseDbError, isActiveRecord,
} from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAdminData } from '../../hooks/useAdminData';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { TabSection } from '../ui/shared';
import ListTable from '../ui/ListTable';
import StatusPill from '../ui/StatusPill';
import ShowInactiveToggle from '../ui/ShowInactiveToggle';
import CardActionsMenu from '../ui/CardActionsMenu';
import CascadingDeactivateModal from '../ui/CascadingDeactivateModal';
import { countOrgDeactivateImpact } from '../../lib/deleteImpactCounts';
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
  requireOrg = false,
  onOrgCreated,
}) {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const { profile } = useAuth();
  const {
    orgs, departments, people, teams,
    addOrg, updateOrg, setOrgActive,
    addDepartment, updateDepartment, setDepartmentActive,
    addPerson, updatePerson, setPersonActive, addTeam, addTeamMember, reload,
  } = useAdminData();
  const [adminTab, setAdminTab] = useState(initialTab || 'org');
  const [modal, setModal] = useState(null);
  const [editingOrg, setEditingOrg] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [busyOrgId, setBusyOrgId] = useState(null);
  const [busyPersonId, setBusyPersonId] = useState(null);
  const [busyDepartmentId, setBusyDepartmentId] = useState(null);
  const [showInactiveOrgs, setShowInactiveOrgs] = useState(false);
  const [showInactivePeople, setShowInactivePeople] = useState(false);
  const [showInactiveDepartments, setShowInactiveDepartments] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateCounts, setDeactivateCounts] = useState([]);
  const [deactivateCountsLoading, setDeactivateCountsLoading] = useState(false);
  const [deactivateBusy, setDeactivateBusy] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');
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
    setEditingOrg(null);
    setModal('org');
    onInitialOpenAddOrgConsumed?.();
  }, [initialOpenAddOrg, onInitialOpenAddOrgConsumed]);

  // If mandatory Org setup is still required and the modal was closed somehow, reopen it.
  useEffect(() => {
    if (!requireOrg) return;
    if (modal === 'org') return;
    setAdminTab('org');
    setEditingOrg(null);
    setModal('org');
  }, [requireOrg, modal]);

  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';
  const personName = (id) => people.find((p) => p.id === id)?.name || '—';
  const orgIsActive = (o) => isActiveRecord(o);
  const personIsActive = (p) => isActiveRecord(p);
  const departmentIsActive = (d) => isActiveRecord(d);
  const activeOrgs = orgs.filter(orgIsActive);
  const inactiveOrgsCount = orgs.filter((o) => !orgIsActive(o)).length;
  const visibleOrgs = showInactiveOrgs ? orgs : activeOrgs;
  const activePeople = people.filter(personIsActive);
  const inactivePeopleCount = people.filter((p) => !personIsActive(p)).length;
  const visiblePeople = showInactivePeople ? people : activePeople;
  const activeDepartments = departments.filter(departmentIsActive);
  const inactiveDepartmentsCount = departments.filter((d) => !departmentIsActive(d)).length;
  const visibleDepartments = showInactiveDepartments ? departments : activeDepartments;

  const openAddOrg = () => {
    setEditingOrg(null);
    setModal('org');
  };
  const openEditOrg = (o) => {
    setEditingOrg(o);
    setModal('org');
  };
  const closeOrgModal = () => {
    if (requireOrg && !editingOrg) return;
    setModal(null);
    setEditingOrg(null);
  };

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

  const openDeactivateOrg = async (o) => {
    setDeactivateError('');
    setDeactivateTarget(o);
    setDeactivateCounts([]);
    setDeactivateCountsLoading(true);
    try {
      setDeactivateCounts(await countOrgDeactivateImpact(o.id));
    } catch (err) {
      setDeactivateError(err.message || 'Could not load related records');
    } finally {
      setDeactivateCountsLoading(false);
    }
  };

  const closeDeactivateOrg = () => {
    if (deactivateBusy) return;
    setDeactivateTarget(null);
    setDeactivateCounts([]);
    setDeactivateError('');
  };

  const confirmDeactivateOrg = async () => {
    if (!deactivateTarget) return;
    setDeactivateBusy(true);
    setDeactivateError('');
    try {
      await setOrgActive(deactivateTarget.id, false);
      setDeactivateTarget(null);
      setDeactivateCounts([]);
    } catch (err) {
      setDeactivateError(err.message || 'Could not deactivate org');
    } finally {
      setDeactivateBusy(false);
    }
  };

  const toggleOrgActive = async (o) => {
    if (orgIsActive(o)) {
      await openDeactivateOrg(o);
      return;
    }
    setBusyOrgId(o.id);
    try {
      await setOrgActive(o.id, true);
    } catch (err) {
      alert(err.message || 'Could not reactivate org');
    } finally {
      setBusyOrgId(null);
    }
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

  const toggleDepartmentActive = async (d) => {
    const next = !departmentIsActive(d);
    if (!next && !window.confirm(`Deactivate ${d.name}? It will no longer appear in assign-to pickers.`)) return;
    setBusyDepartmentId(d.id);
    try {
      await setDepartmentActive(d.id, next);
    } catch (err) {
      alert(err.message || 'Could not update department');
    } finally {
      setBusyDepartmentId(null);
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
            onAdd={openAddOrg}
            addLabel="Add Org"
            color={C.purple}
            empty={orgs.length === 0}
            emptyText="No orgs yet. Add your first company to get started."
            emptyIcon={Building2}
            viewMode={viewMode}
            onViewChange={setViewMode}
          >
            <div className="flex justify-end mb-3">
              <ShowInactiveToggle
                show={showInactiveOrgs}
                onChange={setShowInactiveOrgs}
                inactiveCount={inactiveOrgsCount}
              />
            </div>
            {visibleOrgs.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: C.sub }}>
                {inactiveOrgsCount > 0
                  ? 'No active orgs. Turn on Show inactive to find and reactivate one.'
                  : 'No orgs yet.'}
              </p>
            ) : viewMode === 'list' ? (
              <ListTable
                columns={[
                  { key: 'name', label: 'Name', sortable: true, render: (c) => <span className="font-semibold">{c.name}</span> },
                  { key: 'type', label: 'Type', render: () => 'Company' },
                  {
                    key: 'is_active',
                    label: 'Status',
                    sortable: true,
                    sortValue: (c) => (orgIsActive(c) ? 1 : 0),
                    render: (c) => (
                      <StatusPill
                        label={orgIsActive(c) ? 'Active' : 'Inactive'}
                        color={orgIsActive(c) ? C.green : C.sub}
                      />
                    ),
                  },
                  {
                    key: 'actions',
                    label: '',
                    render: (c) => (
                      <div className="relative h-8 w-8 ml-auto">
                        <CardActionsMenu
                          busy={busyOrgId === c.id}
                          onEdit={() => openEditOrg(c)}
                          softLabel={orgIsActive(c) ? 'Deactivate' : 'Reactivate'}
                          onSoft={() => toggleOrgActive(c)}
                        />
                      </div>
                    ),
                  },
                ]}
                rows={visibleOrgs}
                onRowClick={openEditOrg}
                initialSortKey="name"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {visibleOrgs.map((c) => {
                  const inactive = !orgIsActive(c);
                  return (
                    <div
                      key={c.id}
                      className="relative bg-white rounded-2xl p-4 shadow-sm border"
                      style={{
                        borderColor: C.border,
                        opacity: inactive ? 0.72 : 1,
                        background: inactive ? tint(C.sub, '08') : '#fff',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEditOrg(c)}
                        className="flex items-center gap-3 w-full text-left pr-8"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: tint(inactive ? C.sub : C.purple, '18') }}
                        >
                          <Building2 size={16} style={{ color: inactive ? C.sub : C.purple }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <div className="text-sm font-bold truncate" style={{ color: inactive ? C.sub : C.ink }}>{c.name}</div>
                            <StatusPill
                              label={inactive ? 'Inactive' : 'Active'}
                              color={inactive ? C.sub : C.green}
                            />
                          </div>
                          <div className="text-xs truncate" style={{ color: C.sub }}>Company</div>
                        </div>
                      </button>
                      <CardActionsMenu
                        busy={busyOrgId === c.id}
                        onEdit={() => openEditOrg(c)}
                        softLabel={inactive ? 'Reactivate' : 'Deactivate'}
                        onSoft={() => toggleOrgActive(c)}
                      />
                    </div>
                  );
                })}
              </div>
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
            disabled={activeOrgs.length === 0}
            disabledText="Add an Org first."
            empty={departments.length === 0}
            emptyText="No departments yet."
            emptyIcon={MapPin}
            viewMode={viewMode}
            onViewChange={setViewMode}
          >
            <div className="flex justify-end mb-3">
              <ShowInactiveToggle
                show={showInactiveDepartments}
                onChange={setShowInactiveDepartments}
                inactiveCount={inactiveDepartmentsCount}
              />
            </div>
            {visibleDepartments.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: C.sub }}>
                {inactiveDepartmentsCount > 0
                  ? 'No active departments. Turn on Show inactive to find and reactivate one.'
                  : 'No departments yet.'}
              </p>
            ) : viewMode === 'list' ? (
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
                  {
                    key: 'is_active',
                    label: 'Status',
                    sortable: true,
                    sortValue: (d) => (departmentIsActive(d) ? 1 : 0),
                    render: (d) => (
                      <StatusPill
                        label={departmentIsActive(d) ? 'Active' : 'Inactive'}
                        color={departmentIsActive(d) ? C.green : C.sub}
                      />
                    ),
                  },
                  {
                    key: 'actions',
                    label: '',
                    render: (d) => (
                      <div className="relative h-8 w-8 ml-auto">
                        <CardActionsMenu
                          busy={busyDepartmentId === d.id}
                          onEdit={() => openEditDepartment(d)}
                          softLabel={departmentIsActive(d) ? 'Deactivate' : 'Reactivate'}
                          onSoft={() => toggleDepartmentActive(d)}
                        />
                      </div>
                    ),
                  },
                ]}
                rows={visibleDepartments}
                onRowClick={openEditDepartment}
                initialSortKey="name"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {visibleDepartments.map((d) => {
                  const inactive = !departmentIsActive(d);
                  return (
                    <div
                      key={d.id}
                      className="relative bg-white rounded-2xl p-4 shadow-sm border"
                      style={{
                        borderColor: C.border,
                        opacity: inactive ? 0.72 : 1,
                        background: inactive ? tint(C.sub, '08') : '#fff',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEditDepartment(d)}
                        className="flex items-center gap-3 w-full text-left pr-8"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: tint(inactive ? C.sub : C.teal, '18') }}
                        >
                          <MapPin size={16} style={{ color: inactive ? C.sub : C.teal }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <div className="text-sm font-bold truncate" style={{ color: inactive ? C.sub : C.ink }}>{d.name}</div>
                            <StatusPill
                              label={inactive ? 'Inactive' : 'Active'}
                              color={inactive ? C.sub : C.green}
                            />
                          </div>
                          <div className="text-xs truncate" style={{ color: C.sub }}>
                            {orgs.find((c) => c.id === d.org_id)?.name || '—'}
                            {d.location ? ` · ${d.location}` : ''}
                          </div>
                        </div>
                      </button>
                      <CardActionsMenu
                        busy={busyDepartmentId === d.id}
                        onEdit={() => openEditDepartment(d)}
                        softLabel={inactive ? 'Reactivate' : 'Deactivate'}
                        onSoft={() => toggleDepartmentActive(d)}
                      />
                    </div>
                  );
                })}
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
            disabled={activeDepartments.length === 0}
            disabledText="Add a Department first."
            empty={people.length === 0}
            emptyText="No people yet."
            emptyIcon={UserCircle2}
            viewMode={viewMode}
            onViewChange={setViewMode}
          >
            <div className="flex justify-end mb-3">
              <ShowInactiveToggle
                show={showInactivePeople}
                onChange={setShowInactivePeople}
                inactiveCount={inactivePeopleCount}
              />
            </div>
            {visiblePeople.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: C.sub }}>
                {inactivePeopleCount > 0
                  ? 'No active people. Turn on Show inactive to find and reactivate someone.'
                  : 'No people yet.'}
              </p>
            ) : viewMode === 'list' ? (
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
                      <div className="relative h-8 w-8 ml-auto">
                        <CardActionsMenu
                          busy={busyPersonId === p.id}
                          onEdit={() => openEditPerson(p)}
                          softLabel={personIsActive(p) ? 'Deactivate' : 'Reactivate'}
                          onSoft={() => togglePersonActive(p)}
                        />
                      </div>
                    ),
                  },
                ]}
                rows={visiblePeople}
                onRowClick={openEditPerson}
                initialSortKey="name"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {visiblePeople.map((p) => {
                  const inactive = !personIsActive(p);
                  return (
                    <div
                      key={p.id}
                      className="relative bg-white rounded-2xl p-4 shadow-sm border"
                      style={{
                        borderColor: C.border,
                        opacity: inactive ? 0.72 : 1,
                        background: inactive ? tint(C.sub, '08') : '#fff',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEditPerson(p)}
                        className="flex items-start gap-3 w-full text-left pr-8"
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
                      <CardActionsMenu
                        busy={busyPersonId === p.id}
                        onEdit={() => openEditPerson(p)}
                        softLabel={inactive ? 'Reactivate' : 'Deactivate'}
                        onSoft={() => togglePersonActive(p)}
                      />
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

      {modal === 'org' && (
        <Modal
          title={editingOrg ? 'Edit Org' : 'Add Org'}
          hideClose={requireOrg && !editingOrg}
          onClose={requireOrg && !editingOrg ? undefined : closeOrgModal}
        >
          <FormOrg
            initial={editingOrg}
            onSave={async (n) => {
              if (editingOrg) await updateOrg(editingOrg.id, n);
              else {
                await addOrg(n);
                onOrgCreated?.();
              }
              setModal(null);
              setEditingOrg(null);
            }}
          />
          {requireOrg && !editingOrg && (
            <p className="text-xs mt-3" style={{ color: C.sub }}>
              Add your first organization to continue. This is a one-time setup step.
            </p>
          )}
        </Modal>
      )}
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

      {deactivateTarget && (
        <CascadingDeactivateModal
          entityLabel="Org"
          recordName={deactivateTarget.name}
          counts={deactivateCounts}
          countsLoading={deactivateCountsLoading}
          busy={deactivateBusy}
          error={deactivateError}
          onClose={closeDeactivateOrg}
          onConfirm={confirmDeactivateOrg}
        />
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
              is_active: true,
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
