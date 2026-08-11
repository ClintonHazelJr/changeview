import { useState } from 'react';
import {
  Building2, MapPin, Users, UserCircle2, Plus, ChevronRight, Mail, Tag,
} from 'lucide-react';
import { C, HEAD, BODY, tint, initials } from '../../lib/constants';
import { useAdminData } from '../../hooks/useAdminData';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { ListCard, TabSection } from '../ui/shared';
import Modal from '../ui/Modal';
import {
  FormOrg, FormDepartment, FormPerson, FormTeam, FormTeamMember,
} from '../forms/AdminForms';

export default function SystemAdmin() {
  const { activeWorkspace } = useWorkspace();
  const {
    orgs, departments, people, teams,
    addOrg, addDepartment, addPerson, addTeam, addTeamMember,
  } = useAdminData();
  const [adminTab, setAdminTab] = useState('org');
  const [modal, setModal] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);

  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';
  const personName = (id) => people.find((p) => p.id === id)?.name || '—';

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
            <p className="text-sm max-w-md" style={{ color: C.sub }}>Set up your Org, Department, People, and Project Teams, in that order, then head to Initiatives.</p>
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
          <TabSection title="Org" subtitle={`Add each client company you'll run change work for inside ${activeWorkspace?.name}.`} onAdd={() => setModal('org')} addLabel="Add Org" color={C.purple} empty={orgs.length === 0} emptyText="No orgs yet. Add your first company to get started." emptyIcon={Building2}>
            <div className="grid grid-cols-2 gap-3">{orgs.map((c) => <ListCard key={c.id} icon={Building2} color={C.purple} title={c.name} subtitle="Company" />)}</div>
          </TabSection>
        )}
        {adminTab === 'department' && (
          <TabSection title="Department" subtitle="Departments sit under an Org and tag who's impacted on every Impact record." onAdd={() => setModal('department')} addLabel="Add Department" color={C.teal} disabled={orgs.length === 0} disabledText="Add an Org first." empty={departments.length === 0} emptyText="No departments yet." emptyIcon={MapPin}>
            <div className="grid grid-cols-2 gap-3">{departments.map((d) => <ListCard key={d.id} icon={MapPin} color={C.teal} title={d.name} subtitle={orgs.find((c) => c.id === d.org_id)?.name} tag={d.location} />)}</div>
          </TabSection>
        )}
        {adminTab === 'people' && (
          <TabSection title="People" subtitle="Your directory. Add someone once here, then reuse them as a Stakeholder or Team Member on any Initiative." onAdd={() => setModal('people')} addLabel="Add Person" color={C.coral} disabled={departments.length === 0} disabledText="Add a Department first." empty={people.length === 0} emptyText="No people yet." emptyIcon={UserCircle2}>
            <div className="grid grid-cols-2 gap-3">
              {people.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border flex items-start gap-3" style={{ borderColor: C.border }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: C.coral }}>{initials(p.name)}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{p.name}</div>
                    <div className="text-xs truncate" style={{ color: C.sub }}>{p.title || '—'} · {deptName(p.department_id)}</div>
                    {p.email && <div className="flex items-center gap-1 text-xs mt-1 truncate" style={{ color: C.sub }}><Mail size={11} />{p.email}</div>}
                  </div>
                </div>
              ))}
            </div>
          </TabSection>
        )}
        {adminTab === 'teams' && (
          <TabSection title="Project Teams" subtitle="Group People into a team, so you can assign a whole team to an Initiative in one go." onAdd={() => setModal('team')} addLabel="Add Project Team" color={C.green} disabled={people.length === 0} disabledText="Add at least one Person first." empty={teams.length === 0} emptyText="No project teams yet." emptyIcon={Users}>
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
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: tint(C.green, '18'), color: '#1a8a5f' }}><Tag size={10} className="inline mr-1" />{m.role}</span>
                        </div>
                      ))}
                      <button type="button" onClick={() => setModal({ type: 'teamMember', teamId: t.id })} className="flex items-center gap-1.5 text-xs font-bold mt-2" style={{ color: C.purple }}><Plus size={13} /> Add team member</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabSection>
        )}
      </div>

      {modal === 'org' && <Modal title="Add Org" onClose={() => setModal(null)}><FormOrg onSave={async (n) => { await addOrg(n); setModal(null); }} /></Modal>}
      {modal === 'department' && <Modal title="Add Department" onClose={() => setModal(null)}><FormDepartment orgs={orgs} onSave={async (d) => { await addDepartment(d); setModal(null); }} /></Modal>}
      {modal === 'people' && <Modal title="Add Person" onClose={() => setModal(null)}><FormPerson departments={departments} onSave={async (p) => { await addPerson(p); setModal(null); }} /></Modal>}
      {modal === 'team' && <Modal title="Add Project Team" onClose={() => setModal(null)}><FormTeam onSave={async (n) => { await addTeam(n); setModal(null); }} /></Modal>}
      {modal?.type === 'teamMember' && (
        <Modal title="Add Team Member" onClose={() => setModal(null)}>
          <FormTeamMember people={people} onSave={async (personId, role) => { await addTeamMember(modal.teamId, personId, role); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}
