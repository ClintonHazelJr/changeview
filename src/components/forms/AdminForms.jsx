import { useEffect, useState } from 'react';
import { Loader2, Sparkles, Copy } from 'lucide-react';
import {
  C, inputClass, inputStyle, TAG_OPTIONS, SEVERITY_COLOR, SEVERITY_LEVELS, stripInitiativeMeta,
} from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  uploadAttachment,
  listImpactAttachments,
  insertImpactAttachmentRow,
  deleteImpactAttachmentRow,
  downloadAttachment,
  listLearningNeedAttachments,
  insertLearningNeedAttachmentRow,
  deleteLearningNeedAttachmentRow,
} from '../../lib/attachments';
import { Field, Pill, SaveRow } from '../ui/shared';
import PersonSelect from '../ui/PersonSelect';
import { AttachmentList, FieldWithAttach } from '../ui/AttachmentField';

export function FormOrg({ onSave }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try { if (name) await onSave(name); } catch (err) { setError(err.message); }
    }}>
      <Field label="Org">
        <input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Software Co" autoFocus />
      </Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow />
    </form>
  );
}

export function FormDepartment({ orgs, initial, onSave }) {
  const [orgId, setOrgId] = useState(initial?.org_id || orgs[0]?.id || '');
  const [name, setName] = useState(initial?.name || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [error, setError] = useState('');
  const editing = Boolean(initial?.id);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try { if (orgId && name) await onSave({ orgId, name, location }); } catch (err) { setError(err.message); }
    }}>
      <Field label="Org">
        <select className={inputClass} style={inputStyle} value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          {orgs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Department"><input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operations" autoFocus /></Field>
      <Field label="Location"><input className={inputClass} style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 123 Anytown US" /></Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow label={editing ? 'Save changes' : 'Save'} />
    </form>
  );
}

export function FormPerson({ departments, initial, onSave }) {
  const [departmentId, setDepartmentId] = useState(initial?.department_id || departments[0]?.id || '');
  const [name, setName] = useState(initial?.name || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [error, setError] = useState('');
  const editing = Boolean(initial?.id);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try { if (name) await onSave({ departmentId, name, title, email }); } catch (err) { setError(err.message); }
    }}>
      <Field label="Name"><input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Micheal Blackman" autoFocus /></Field>
      <Field label="Department">
        <select className={inputClass} style={inputStyle} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="Title"><input className={inputClass} style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Change Manager" /></Field>
      <Field label="Email"><input className={inputClass} style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. blackman@software.co" /></Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow label={editing ? 'Save changes' : 'Save'} />
    </form>
  );
}

export function FormTeam({ onSave }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try { if (name) await onSave(name); } catch (err) { setError(err.message); }
    }}>
      <Field label="Team name"><input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Agile Avengers" autoFocus /></Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow />
    </form>
  );
}

export function FormTeamMember({ people, departments = [], onSave }) {
  const [personId, setPersonId] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        if (!personId) throw new Error('Select a Person.');
        if (!role.trim()) throw new Error('Role is required.');
        await onSave(personId, role);
      } catch (err) { setError(err.message); }
    }}>
      <PersonSelect
        label="Person"
        people={people}
        departments={departments}
        value={personId}
        onChange={(e) => setPersonId(e.target.value)}
        allowEmpty={false}
      />
      <Field label="Role on this team"><input className={inputClass} style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Project Manager" /></Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow />
    </form>
  );
}

export function FormWorkspace({ onSave }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try { if (name) await onSave(name); } catch (err) { setError(err.message); }
    }}>
      <Field label="Workspace name"><input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coca-Cola" autoFocus /></Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow />
    </form>
  );
}

export function FormInitiative({ initial, onSave }) {
  const { activeWorkspaceId } = useWorkspace();
  const [people, setPeople] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [vals, setVals] = useState({
    name: initial?.name || '',
    description: stripInitiativeMeta(initial?.description),
    programId: initial?.program_id || '',
    startDate: initial?.start_date || '',
    goLiveDate: initial?.proposed_go_live_date || '',
    budget: initial?.budget ?? '',
    useCase: initial?.use_case || '',
    expectedBenefits: initial?.expected_benefits || '',
    changeOwnerId: initial?.change_owner_id || '',
    productOwnerId: initial?.product_owner_id || '',
    businessOwnerId: initial?.business_owner_id || '',
    projectManagerId: initial?.project_manager_id || '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setVals({ ...vals, [k]: e.target.value });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeWorkspaceId) {
        if (!cancelled) {
          setPeople([]);
          setDepartments([]);
          setPrograms([]);
          setLoadingPeople(false);
          setLoadingPrograms(false);
        }
        return;
      }
      setLoadingPeople(true);
      setLoadingPrograms(true);
      const [peopleRes, deptRes, programsRes] = await Promise.all([
        supabase.from('people').select('id, name, title, email, department_id, is_active').eq('workspace_id', activeWorkspaceId).order('name'),
        supabase.from('departments').select('id, name').eq('workspace_id', activeWorkspaceId),
        supabase.from('programs').select('id, name').eq('workspace_id', activeWorkspaceId).order('name'),
      ]);
      if (cancelled) return;
      if (peopleRes.error) setError(peopleRes.error.message);
      setPeople(peopleRes.data || []);
      setDepartments(deptRes.data || []);
      setPrograms(programsRes.data || []);
      setLoadingPeople(false);
      setLoadingPrograms(false);
      if ((programsRes.data || []).length === 1) {
        setVals((prev) => ({ ...prev, programId: prev.programId || programsRes.data[0].id }));
      }
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        if (!vals.programId) throw new Error('Select a Program, or create one under Program first.');
        if (vals.name) await onSave(vals);
      } catch (err) { setError(err.message); }
    }}>
      <Field label="Program">
        {loadingPrograms ? (
          <p className="text-xs" style={{ color: C.sub }}>Loading programs…</p>
        ) : programs.length === 0 ? (
          <p className="text-xs" style={{ color: C.sub }}>Create a Program first (sidebar → Program).</p>
        ) : (
          <select className={inputClass} style={inputStyle} value={vals.programId} onChange={set('programId')} required>
            <option value="">Select program</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Initiative Name"><input className={inputClass} style={inputStyle} value={vals.name} onChange={set('name')} placeholder="e.g. Salesforce Rollout" autoFocus /></Field>
      <Field label="Description"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.description} onChange={set('description')} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start Date"><input type="date" className={inputClass} style={inputStyle} value={vals.startDate} onChange={set('startDate')} /></Field>
        <Field label="Proposed Go Live Date"><input type="date" className={inputClass} style={inputStyle} value={vals.goLiveDate} onChange={set('goLiveDate')} /></Field>
      </div>
      <Field label="Budget"><input type="number" className={inputClass} style={inputStyle} value={vals.budget} onChange={set('budget')} placeholder="e.g. 45000" /></Field>
      <Field label="Use Case"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.useCase} onChange={set('useCase')} /></Field>
      <Field label="Expected Benefits"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.expectedBenefits} onChange={set('expectedBenefits')} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <PersonSelect
          label="Change Owner"
          people={people}
          departments={departments}
          loading={loadingPeople}
          value={vals.changeOwnerId}
          onChange={set('changeOwnerId')}
        />
        <PersonSelect
          label="Product Owner"
          people={people}
          departments={departments}
          loading={loadingPeople}
          value={vals.productOwnerId}
          onChange={set('productOwnerId')}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <PersonSelect
          label="Business Owner"
          people={people}
          departments={departments}
          loading={loadingPeople}
          value={vals.businessOwnerId}
          onChange={set('businessOwnerId')}
        />
        <PersonSelect
          label="Project Manager"
          people={people}
          departments={departments}
          loading={loadingPeople}
          value={vals.projectManagerId}
          onChange={set('projectManagerId')}
        />
      </div>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow disabled={programs.length === 0} />
    </form>
  );
}

export function FormProgram({ orgs, initial, onSave }) {
  const [vals, setVals] = useState({
    name: initial?.name || '',
    organizationId: initial?.organization_id || orgs[0]?.id || '',
    description: initial?.description || '',
    status: initial?.status || 'planning',
    startDate: initial?.start_date || '',
    goLiveDate: initial?.proposed_go_live_date || '',
    budget: initial?.budget ?? '',
    goal: initial?.goal || '',
    benefits: initial?.benefits || '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setVals({ ...vals, [k]: e.target.value });
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        if (!vals.organizationId) throw new Error('Select an Org first (Settings → Org).');
        if (vals.name) await onSave(vals);
      } catch (err) { setError(err.message); }
    }}>
      <Field label="Org">
        {orgs.length === 0 ? (
          <p className="text-xs" style={{ color: C.sub }}>Add an Org in Settings first.</p>
        ) : (
          <select className={inputClass} style={inputStyle} value={vals.organizationId} onChange={set('organizationId')}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Program name"><input className={inputClass} style={inputStyle} value={vals.name} onChange={set('name')} placeholder="e.g. ERP Transformation" autoFocus /></Field>
      <Field label="Description"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.description} onChange={set('description')} /></Field>
      <Field label="Status">
        <select className={inputClass} style={inputStyle} value={vals.status} onChange={set('status')}>
          <option value="planning">Planning</option>
          <option value="delivery">Delivery</option>
          <option value="closed">Closed</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start Date"><input type="date" className={inputClass} style={inputStyle} value={vals.startDate} onChange={set('startDate')} /></Field>
        <Field label="Proposed Go Live"><input type="date" className={inputClass} style={inputStyle} value={vals.goLiveDate} onChange={set('goLiveDate')} /></Field>
      </div>
      <Field label="Budget"><input type="number" className={inputClass} style={inputStyle} value={vals.budget} onChange={set('budget')} /></Field>
      <Field label="Goal"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.goal} onChange={set('goal')} /></Field>
      <Field label="Benefits"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.benefits} onChange={set('benefits')} /></Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow disabled={orgs.length === 0} />
    </form>
  );
}

export function FormRequirement({ initiatives, people, departments = [], impacts, tasks = [], initial, onSave }) {
  const [vals, setVals] = useState({
    initiativeId: initial?.initiative_id || initiatives[0]?.id || '',
    description: initial?.description || '',
    status: initial?.status || 'draft',
    priority: initial?.priority || 'medium',
    authorId: initial?.author_id || '',
    approverId: initial?.business_approver_id || '',
    impactIds: initial?.impactIds || [],
    taskIds: initial?.taskIds || [],
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setVals({ ...vals, [k]: e.target.value });
  const initiativeImpacts = impacts.filter((i) => i.initiative_id === vals.initiativeId);
  const initiativeTasks = tasks.filter((t) => t.initiative_id === vals.initiativeId);
  const toggleImpact = (id) => {
    setVals((prev) => ({
      ...prev,
      impactIds: prev.impactIds.includes(id)
        ? prev.impactIds.filter((x) => x !== id)
        : [...prev.impactIds, id],
    }));
  };
  const toggleTask = (id) => {
    setVals((prev) => ({
      ...prev,
      taskIds: prev.taskIds.includes(id)
        ? prev.taskIds.filter((x) => x !== id)
        : [...prev.taskIds, id],
    }));
  };
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        if (!vals.initiativeId) throw new Error('Select an Initiative.');
        if (!vals.description.trim()) throw new Error('Description is required.');
        await onSave(vals);
      } catch (err) { setError(err.message); }
    }}>
      <Field label="Initiative">
        {initiatives.length === 0 ? (
          <p className="text-xs" style={{ color: C.sub }}>Create an Initiative first.</p>
        ) : (
          <select className={inputClass} style={inputStyle} value={vals.initiativeId} onChange={set('initiativeId')}>
            {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Description"><textarea rows={3} className={inputClass} style={inputStyle} value={vals.description} onChange={set('description')} autoFocus /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Status">
          <select className={inputClass} style={inputStyle} value={vals.status} onChange={set('status')}>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </Field>
        <Field label="Priority">
          <select className={inputClass} style={inputStyle} value={vals.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>
      </div>
      <PersonSelect label="Author" people={people} departments={departments} value={vals.authorId} onChange={set('authorId')} />
      <PersonSelect label="Business Approver" people={people} departments={departments} value={vals.approverId} onChange={set('approverId')} />
      <Field label="Linked Impacts">
        {initiativeImpacts.length === 0 ? (
          <p className="text-xs" style={{ color: C.sub }}>No impacts on this Initiative yet.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {initiativeImpacts.map((imp) => (
              <label key={imp.id} className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
                <input
                  type="checkbox"
                  checked={vals.impactIds.includes(imp.id)}
                  onChange={() => toggleImpact(imp.id)}
                  className="mt-1"
                />
                <span>{imp.reference_number || 'Impact'} — {imp.impact_description || 'No description'}</span>
              </label>
            ))}
          </div>
        )}
      </Field>
      <Field label="Linked Tasks">
        {initiativeTasks.length === 0 ? (
          <p className="text-xs" style={{ color: C.sub }}>No tasks on this Initiative yet.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {initiativeTasks.map((task) => (
              <label key={task.id} className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
                <input
                  type="checkbox"
                  checked={vals.taskIds.includes(task.id)}
                  onChange={() => toggleTask(task.id)}
                  className="mt-1"
                />
                <span>{task.name} <span style={{ color: C.sub }}>({task.status?.replace('_', ' ') || 'backlog'})</span></span>
              </label>
            ))}
          </div>
        )}
      </Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow disabled={initiatives.length === 0} />
    </form>
  );
}

export function FormTask({
  initiatives, people, departments = [], teams, requirements, initial, onSave, onDelete,
}) {
  const [vals, setVals] = useState({
    initiativeId: initial?.initiative_id || initiatives[0]?.id || '',
    name: initial?.name || '',
    description: initial?.description || '',
    assigneeId: initial?.assignee_id || '',
    projectTeamId: initial?.project_team_id || '',
    status: initial?.status || 'backlog',
    priority: initial?.priority || 'medium',
    effortEstimate: initial?.effort_estimate || '',
    startDate: initial?.start_date || '',
    finishDate: initial?.finish_date || '',
    sprint: initial?.sprint || '',
    pi: initial?.pi || '',
    requirementIds: initial?.requirementIds || [],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setVals({ ...vals, [k]: e.target.value });
  const initiativeReqs = requirements.filter((r) => r.initiative_id === vals.initiativeId);
  const toggleReq = (id) => {
    setVals((prev) => ({
      ...prev,
      requirementIds: prev.requirementIds.includes(id)
        ? prev.requirementIds.filter((x) => x !== id)
        : [...prev.requirementIds, id],
    }));
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
          if (!vals.initiativeId) throw new Error('Select an Initiative.');
          if (!vals.name.trim()) throw new Error('Name is required.');
          await onSave(vals);
        } catch (err) {
          setError(err.message);
        } finally {
          setSaving(false);
        }
      }}
    >
      <Field label="Initiative">
        {initiatives.length === 0 ? (
          <p className="text-xs" style={{ color: C.sub }}>Create an Initiative first.</p>
        ) : (
          <select className={inputClass} style={inputStyle} value={vals.initiativeId} onChange={set('initiativeId')} required>
            {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Name">
        <input className={inputClass} style={inputStyle} value={vals.name} onChange={set('name')} placeholder="e.g. Draft go-live comms" autoFocus />
      </Field>
      <Field label="Description">
        <textarea rows={2} className={inputClass} style={inputStyle} value={vals.description} onChange={set('description')} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <PersonSelect label="Assignee" people={people} departments={departments} value={vals.assigneeId} onChange={set('assigneeId')} />
        <Field label="Project Team">
          {teams.length === 0 ? (
            <p className="text-xs" style={{ color: C.sub }}>Add Project Teams in Settings.</p>
          ) : (
            <select className={inputClass} style={inputStyle} value={vals.projectTeamId} onChange={set('projectTeamId')}>
              <option value="">None</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Status">
          <select className={inputClass} style={inputStyle} value={vals.status} onChange={set('status')}>
            <option value="backlog">Backlog</option>
            <option value="ready">Ready</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
        </Field>
        <Field label="Priority">
          <select className={inputClass} style={inputStyle} value={vals.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>
      </div>
      <Field label="Effort Estimate">
        <input className={inputClass} style={inputStyle} value={vals.effortEstimate} onChange={set('effortEstimate')} placeholder="e.g. 3 points or 2 days" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start Date"><input type="date" className={inputClass} style={inputStyle} value={vals.startDate} onChange={set('startDate')} /></Field>
        <Field label="Finish Date"><input type="date" className={inputClass} style={inputStyle} value={vals.finishDate} onChange={set('finishDate')} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Sprint"><input className={inputClass} style={inputStyle} value={vals.sprint} onChange={set('sprint')} placeholder="e.g. Sprint 12" /></Field>
        <Field label="PI"><input className={inputClass} style={inputStyle} value={vals.pi} onChange={set('pi')} placeholder="e.g. PI 3" /></Field>
      </div>
      <Field label="Linked Requirements">
        {initiativeReqs.length === 0 ? (
          <p className="text-xs" style={{ color: C.sub }}>No requirements on this Initiative yet.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {initiativeReqs.map((r) => (
              <label key={r.id} className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
                <input
                  type="checkbox"
                  checked={vals.requirementIds.includes(r.id)}
                  onChange={() => toggleReq(r.id)}
                  className="mt-1"
                />
                <span>{r.reference_number || 'Req'} — {r.description}</span>
              </label>
            ))}
          </div>
        )}
      </Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow label={saving ? 'Saving…' : (initial?.id ? 'Save changes' : 'Save')} onDelete={onDelete} disabled={saving || initiatives.length === 0} />
    </form>
  );
}

function titleCase(value = '') {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

function makePending(files) {
  return files.map((file) => ({
    localKey: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
    file_name: file.name,
    file,
    pending: true,
  }));
}

export function FormImpact({ departments, initial, onSave, onDelete, onComplete }) {
  const editing = Boolean(initial?.id);
  const { profile } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const accountId = profile?.account_id;
  const workspaceId = activeWorkspaceId;

  const [departmentId, setDepartmentId] = useState(initial?.department_id || departments[0]?.id || '');
  const [headcount, setHeadcount] = useState(initial?.headcount_impacted ?? '');
  const [currentSystem, setCurrentSystem] = useState(initial?.current_state_system || '');
  const [currentProcess, setCurrentProcess] = useState(initial?.current_state_process || '');
  const [futureSystem, setFutureSystem] = useState(initial?.future_state_system || '');
  const [futureProcess, setFutureProcess] = useState(initial?.future_state_process || '');
  const [description, setDescription] = useState(initial?.impact_description || '');
  const [status, setStatus] = useState(initial?.status || 'draft');
  const [severity, setSeverity] = useState({
    org: initial?.severity_org || 'none',
    people: initial?.severity_people || 'none',
    process: initial?.severity_process || 'none',
    system: initial?.severity_system || 'none',
    environment: initial?.severity_environment || 'none',
  });
  const [tags, setTags] = useState(
    (initial?.intervention_tags || []).map((t) => TAG_OPTIONS.find((o) => o.toLowerCase() === String(t).toLowerCase()) || titleCase(t)),
  );
  const [currentFiles, setCurrentFiles] = useState([]);
  const [futureFiles, setFutureFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listImpactAttachments(initial.id);
        if (cancelled) return;
        setCurrentFiles(rows.filter((r) => r.field === 'current_process'));
        setFutureFiles(rows.filter((r) => r.field === 'future_process'));
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [initial?.id]);

  function toggleTag(t) { setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]); }

  async function removeImpactFile(item, field, setter) {
    if (item.pending) {
      setter((prev) => prev.filter((x) => x.localKey !== item.localKey));
      return;
    }
    await deleteImpactAttachmentRow(item);
    setter((prev) => prev.filter((x) => x.id !== item.id));
  }

  async function syncFieldUploads(impactId, field, items) {
    const pending = items.filter((i) => i.pending && i.file);
    for (const item of pending) {
      const uploaded = await uploadAttachment({
        accountId,
        workspaceId,
        folder: `impacts/${impactId}`,
        file: item.file,
      });
      await insertImpactAttachmentRow({
        accountId,
        workspaceId,
        impactId,
        field,
        fileName: uploaded.fileName,
        storagePath: uploaded.storagePath,
        contentType: uploaded.contentType,
        fileSize: uploaded.fileSize,
      });
    }
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setSaving(true);
      setError('');
      try {
        const saved = await onSave({
          departmentId, headcount: Number(headcount) || 0, currentSystem, currentProcess,
          futureSystem, futureProcess, description, severity, tags, status,
        });
        const impactId = saved?.id || initial?.id;
        if (!impactId) throw new Error('Impact was saved but no id was returned.');
        if (!accountId || !workspaceId) throw new Error('Missing account or workspace for attachments.');
        await syncFieldUploads(impactId, 'current_process', currentFiles);
        await syncFieldUploads(impactId, 'future_process', futureFiles);
        onComplete?.();
      } catch (err) { setError(err.message); }
      finally { setSaving(false); }
    }}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Department">
          {departments.length === 0 ? (
            <p className="text-xs" style={{ color: C.sub }}>Add a Department in Settings first.</p>
          ) : (
            <select className={inputClass} style={inputStyle} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </Field>
        <Field label="# Impacted"><input type="number" className={inputClass} style={inputStyle} value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="e.g. 30" /></Field>
      </div>
      <Field label="Status">
        <select className={inputClass} style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Current State — System"><input className={inputClass} style={inputStyle} value={currentSystem} onChange={(e) => setCurrentSystem(e.target.value)} /></Field>
        <Field label="Future State — System"><input className={inputClass} style={inputStyle} value={futureSystem} onChange={(e) => setFutureSystem(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FieldWithAttach
          label="Current State — Process"
          onFiles={(files) => setCurrentFiles((prev) => [...prev, ...makePending(files)])}
        >
          <input className={inputClass} style={inputStyle} value={currentProcess} onChange={(e) => setCurrentProcess(e.target.value)} />
          <AttachmentList
            items={currentFiles}
            onRemove={(item) => removeImpactFile(item, 'current_process', setCurrentFiles).catch((err) => setError(err.message))}
            onDownload={(item) => downloadAttachment(item.file_path, item.file_name).catch((err) => setError(err.message))}
          />
        </FieldWithAttach>
        <FieldWithAttach
          label="Future State — Process"
          onFiles={(files) => setFutureFiles((prev) => [...prev, ...makePending(files)])}
        >
          <input className={inputClass} style={inputStyle} value={futureProcess} onChange={(e) => setFutureProcess(e.target.value)} />
          <AttachmentList
            items={futureFiles}
            onRemove={(item) => removeImpactFile(item, 'future_process', setFutureFiles).catch((err) => setError(err.message))}
            onDownload={(item) => downloadAttachment(item.file_path, item.file_name).catch((err) => setError(err.message))}
          />
        </FieldWithAttach>
      </div>
      <Field label="Impact Description"><textarea rows={2} className={inputClass} style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Field label="Severity">
        <div className="space-y-2">
          {Object.keys(severity).map((k) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-xs capitalize font-medium" style={{ color: C.ink }}>{k}</span>
              <div className="flex items-center gap-1.5">
                {SEVERITY_LEVELS.map((lvl) => (
                  <button
                    type="button"
                    key={lvl}
                    title={lvl === 'none' ? 'No Impact' : titleCase(lvl)}
                    aria-label={`${k} ${lvl === 'none' ? 'No Impact' : lvl}`}
                    onClick={() => setSeverity({ ...severity, [k]: lvl })}
                    className="w-6 h-6 rounded-full border-2"
                    style={{
                      background: severity[k] === lvl ? SEVERITY_COLOR[lvl] : '#fff',
                      borderColor: SEVERITY_COLOR[lvl],
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          <p className="text-[10px]" style={{ color: C.sub }}>Dots: No Impact · Low · Medium · High</p>
        </div>
      </Field>
      <Field label="Intervention"><div>{TAG_OPTIONS.map((t) => <Pill key={t} active={tags.includes(t)} color={C.coral} onClick={() => toggleTag(t)}>{t}</Pill>)}</div></Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow label={saving ? 'Saving…' : (editing ? 'Save changes' : 'Save')} onDelete={onDelete} disabled={saving} />
    </form>
  );
}

export function FormStakeholder({ people, departments = [], initial, onSave, onDelete }) {
  const editing = Boolean(initial?.id);
  const [personId, setPersonId] = useState(initial?.person_id || '');
  const [role, setRole] = useState(initial?.project_role || '');
  const [raci, setRaci] = useState({
    r: Boolean(initial?.raci_responsible),
    a: Boolean(initial?.raci_accountable),
    c: Boolean(initial?.raci_consulted),
    i: Boolean(initial?.raci_informed),
  });
  const [error, setError] = useState('');
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        if (!personId) throw new Error('Select a Person.');
        await onSave({ personId, role, raci });
      } catch (err) { setError(err.message); }
    }}>
      <PersonSelect
        label="Person"
        people={people}
        departments={departments}
        value={personId}
        onChange={(e) => setPersonId(e.target.value)}
        allowEmpty={false}
      />
      <Field label="Project Role"><input className={inputClass} style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. SME" /></Field>
      <Field label="RACI">
        <div className="flex gap-4">
          {[['r', 'Responsible'], ['a', 'Accountable'], ['c', 'Consulted'], ['i', 'Informed']].map(([k, label]) => (
            <label key={k} className="flex items-center gap-1.5 text-xs" style={{ color: C.ink }}>
              <input type="checkbox" checked={raci[k]} onChange={(e) => setRaci({ ...raci, [k]: e.target.checked })} /> {label}
            </label>
          ))}
        </div>
      </Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow label={editing ? 'Save changes' : 'Save'} onDelete={onDelete} />
    </form>
  );
}

export function FormLearningNeed({ impacts, deptName, initial, onSave, onDelete, onComplete }) {
  const editing = Boolean(initial?.id);
  const { profile } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const accountId = profile?.account_id;
  const workspaceId = activeWorkspaceId;

  const [impactId, setImpactId] = useState(initial?.impact_id || impacts[0]?.id || '');
  const [team, setTeam] = useState(initial?.team || '');
  const [goal, setGoal] = useState(initial?.goal || '');
  const [headcount, setHeadcount] = useState(initial?.headcount ?? '');
  const [type, setType] = useState(initial?.type || 'Training');
  const [sessions, setSessions] = useState(initial?.session_count ?? 1);
  const [hours, setHours] = useState(initial?.time_hours ?? 0.5);
  const [status, setStatus] = useState(initial?.status || 'draft');
  const [materials, setMaterials] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listLearningNeedAttachments(initial.id);
        if (!cancelled) setMaterials(rows);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [initial?.id]);

  async function removeMaterial(item) {
    if (item.pending) {
      setMaterials((prev) => prev.filter((x) => x.localKey !== item.localKey));
      return;
    }
    await deleteLearningNeedAttachmentRow(item);
    setMaterials((prev) => prev.filter((x) => x.id !== item.id));
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setSaving(true);
      setError('');
      try {
        const saved = await onSave({
          impactId, team, goal, headcount: Number(headcount) || 0, type, sessions: Number(sessions), hours: Number(hours), status,
        });
        const learningNeedId = saved?.id || initial?.id;
        if (!learningNeedId) throw new Error('Learning Need was saved but no id was returned.');
        if (!accountId || !workspaceId) throw new Error('Missing account or workspace for attachments.');
        for (const item of materials.filter((m) => m.pending && m.file)) {
          const uploaded = await uploadAttachment({
            accountId,
            workspaceId,
            folder: `learning-needs/${learningNeedId}`,
            file: item.file,
          });
          await insertLearningNeedAttachmentRow({
            accountId,
            workspaceId,
            learningNeedId,
            fileName: uploaded.fileName,
            storagePath: uploaded.storagePath,
            contentType: uploaded.contentType,
            fileSize: uploaded.fileSize,
          });
        }
        onComplete?.();
      } catch (err) { setError(err.message); }
      finally { setSaving(false); }
    }}>
      <Field label="Impact">
        <select className={inputClass} style={inputStyle} value={impactId} onChange={(e) => setImpactId(e.target.value)}>
          {impacts.map((i) => <option key={i.id} value={i.id}>{deptName(i.department_id)} impact</option>)}
        </select>
      </Field>
      <Field label="Team"><input className={inputClass} style={inputStyle} value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Credit Officers" /></Field>
      <Field label="Goal"><input className={inputClass} style={inputStyle} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Provide new laptops" /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Headcount"><input type="number" className={inputClass} style={inputStyle} value={headcount} onChange={(e) => setHeadcount(e.target.value)} /></Field>
        <Field label="Type"><select className={inputClass} style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}><option>Training</option><option>Huddle</option></select></Field>
        <Field label="# Sessions"><input type="number" className={inputClass} style={inputStyle} value={sessions} onChange={(e) => setSessions(e.target.value)} /></Field>
      </div>
      <Field label="Time (hrs)"><input type="number" step="0.5" className={inputClass} style={inputStyle} value={hours} onChange={(e) => setHours(e.target.value)} /></Field>
      <Field label="Status">
        <select className={inputClass} style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </Field>
      <FieldWithAttach
        label="Training Material"
        onFiles={(files) => setMaterials((prev) => [...prev, ...makePending(files)])}
      >
        <p className="text-[11px] mb-1" style={{ color: C.sub }}>Attach one or more training documents.</p>
        <AttachmentList
          items={materials}
          onRemove={(item) => removeMaterial(item).catch((err) => setError(err.message))}
          onDownload={(item) => downloadAttachment(item.file_path, item.file_name).catch((err) => setError(err.message))}
        />
      </FieldWithAttach>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow label={saving ? 'Saving…' : (editing ? 'Save changes' : 'Save')} onDelete={onDelete} disabled={saving} />
    </form>
  );
}

export function FormHypercare({ initiative, hypercare, onSave }) {
  const [proposedGoLiveDate, setProposedGoLiveDate] = useState(
    initiative?.proposed_go_live_date || '',
  );
  const [pilot, setPilot] = useState(Boolean(hypercare?.pilot));
  const [pilotSuccessCriteria, setPilotSuccessCriteria] = useState(hypercare?.pilot_success_criteria || '');
  const [assumptions, setAssumptions] = useState(hypercare?.assumptions || '');
  const [duration, setDuration] = useState(hypercare?.duration || '');
  const [startDate, setStartDate] = useState(hypercare?.start_date || '');
  const [endDate, setEndDate] = useState(hypercare?.end_date || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProposedGoLiveDate(initiative?.proposed_go_live_date || '');
    setPilot(Boolean(hypercare?.pilot));
    setPilotSuccessCriteria(hypercare?.pilot_success_criteria || '');
    setAssumptions(hypercare?.assumptions || '');
    setDuration(hypercare?.duration || '');
    setStartDate(hypercare?.start_date || '');
    setEndDate(hypercare?.end_date || '');
  }, [initiative?.id, initiative?.proposed_go_live_date, hypercare?.id, hypercare?.start_date, hypercare?.end_date]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
          await onSave({
            proposedGoLiveDate: proposedGoLiveDate || null,
            pilot,
            pilotSuccessCriteria,
            assumptions,
            duration,
            startDate: startDate || null,
            endDate: endDate || null,
          });
        } catch (err) {
          setError(err.message);
        } finally {
          setSaving(false);
        }
      }}
    >
      <Field label="Proposed Go Live Date">
        <input
          type="date"
          className={inputClass}
          style={inputStyle}
          value={proposedGoLiveDate || ''}
          onChange={(e) => setProposedGoLiveDate(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Hypercare Start Date">
          <input
            type="date"
            className={inputClass}
            style={inputStyle}
            value={startDate || ''}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label="Hypercare End Date">
          <input
            type="date"
            className={inputClass}
            style={inputStyle}
            value={endDate || ''}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Pilot">
        <label className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
          <input type="checkbox" checked={pilot} onChange={(e) => setPilot(e.target.checked)} />
          This initiative includes a pilot
        </label>
      </Field>
      <Field label="Pilot Success Criteria">
        <textarea
          rows={3}
          className={inputClass}
          style={inputStyle}
          value={pilotSuccessCriteria}
          onChange={(e) => setPilotSuccessCriteria(e.target.value)}
          placeholder="What does a successful pilot look like?"
          disabled={!pilot}
        />
      </Field>
      <Field label="Assumptions">
        <textarea
          rows={3}
          className={inputClass}
          style={inputStyle}
          value={assumptions}
          onChange={(e) => setAssumptions(e.target.value)}
          placeholder="Key assumptions for hypercare"
        />
      </Field>
      <Field label="Duration (optional note)">
        <input
          className={inputClass}
          style={inputStyle}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g. 2 weeks"
        />
      </Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow label={saving ? 'Saving…' : 'Save Hypercare'} disabled={saving} />
    </form>
  );
}

export function FormComms({ initiative, impacts, deptName, initial, onSave, onDelete }) {
  const editing = Boolean(initial?.id);
  const [impactId, setImpactId] = useState(initial?.impact_id || '');
  const [deliveryDate, setDeliveryDate] = useState(initial?.delivery_date || '');
  const [keyMessage, setKeyMessage] = useState(initial?.key_message || '');
  const [audience, setAudience] = useState((initial?.audience || []).map(titleCase));
  const [tone, setTone] = useState(initial?.tone || 'professional');
  const [channel, setChannel] = useState((initial?.channel || []).map(titleCase));
  const [prompt, setPrompt] = useState(initial?.ai_prompt_used || '');
  const [generated, setGenerated] = useState(initial?.final_content || initial?.ai_generated_content || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  function toggle(list, setList, val) {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  }

  async function generate() {
    setLoading(true);
    setError('');
    const impact = impacts.find((i) => i.id === impactId);
    try {
      const response = await fetch('/api/generate-comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiativeName: initiative.name,
          initiativeDescription: initiative.description,
          impact: impact ? {
            department: deptName(impact.department_id),
            currentProcess: impact.current_state_process,
            futureProcess: impact.future_state_process,
            severityPeople: impact.severity_people,
            severitySystem: impact.severity_system,
          } : null,
          keyMessage: keyMessage || 'General update on this initiative',
          audience,
          tone,
          channel,
          extraInstructions: prompt,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');
      setGenerated(data.content || 'No content returned. Try again.');
    } catch (e) {
      setError("Couldn't generate right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        await onSave({
          impactId: impactId || null,
          deliveryDate: deliveryDate || null,
          keyMessage,
          audience,
          tone,
          channel,
          prompt,
          generated,
          finalContent: generated,
        });
      } catch (err) { setSaveError(err.message); }
    }}>
      <Field label="Impact (optional, leave blank for initiative-wide comms)">
        <select className={inputClass} style={inputStyle} value={impactId} onChange={(e) => setImpactId(e.target.value)}>
          <option value="">Initiative-wide</option>
          {impacts.map((i) => <option key={i.id} value={i.id}>{deptName(i.department_id)} impact</option>)}
        </select>
      </Field>
      <Field label="Delivery Date">
        <input
          type="date"
          className={inputClass}
          style={inputStyle}
          value={deliveryDate || ''}
          onChange={(e) => setDeliveryDate(e.target.value)}
        />
      </Field>
      <Field label="Key Message"><input className={inputClass} style={inputStyle} value={keyMessage} onChange={(e) => setKeyMessage(e.target.value)} placeholder="e.g. Laptops arrive next week, training required first" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Audience"><div>{['Internal', 'Customer', 'Leadership'].map((a) => <Pill key={a} active={audience.includes(a)} color={C.green} onClick={() => toggle(audience, setAudience, a)}>{a}</Pill>)}</div></Field>
        <Field label="Channel"><div>{['Email', 'External', 'Newsletter'].map((c) => <Pill key={c} active={channel.includes(c)} color={C.green} onClick={() => toggle(channel, setChannel, c)}>{c}</Pill>)}</div></Field>
      </div>
      <Field label="Tone"><div>{['professional', 'playful', 'caring'].map((t) => <Pill key={t} active={tone === t} color={C.purple} onClick={() => setTone(t)}>{t}</Pill>)}</div></Field>
      <Field label="Additional instructions (optional)"><input className={inputClass} style={inputStyle} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Keep it under 100 words" /></Field>
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.purple + '0A', border: `1px solid ${C.purple}30` }}>
        <button type="button" onClick={generate} disabled={loading} className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full text-white shadow-sm disabled:opacity-60" style={{ background: C.purple }}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? 'Generating...' : 'AI Comms Generator'}
        </button>
        {error && <p className="text-xs mt-2" style={{ color: C.coral }}>{error}</p>}
        {generated && (
          <div className="mt-4 bg-white rounded-xl p-4 border relative" style={{ borderColor: C.border }}>
            <button type="button" onClick={() => navigator.clipboard.writeText(generated)} className="absolute top-3 right-3 text-xs flex items-center gap-1" style={{ color: C.sub }}><Copy size={12} /> Copy</button>
            <textarea className="w-full text-sm bg-transparent outline-none resize-none" style={{ color: C.ink, minHeight: '140px' }} value={generated} onChange={(e) => setGenerated(e.target.value)} />
          </div>
        )}
      </div>
      {saveError && <p className="text-xs mb-2" style={{ color: C.coral }}>{saveError}</p>}
      <SaveRow label={editing ? 'Save changes' : 'Save Comms'} onDelete={onDelete} />
    </form>
  );
}
