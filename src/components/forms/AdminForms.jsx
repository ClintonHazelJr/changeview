import { useState } from 'react';
import { Loader2, Sparkles, Copy } from 'lucide-react';
import { C, inputClass, inputStyle, TAG_OPTIONS } from '../../lib/constants';
import { Field, Pill, SaveRow } from '../ui/shared';

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

export function FormDepartment({ orgs, onSave }) {
  const [orgId, setOrgId] = useState(orgs[0]?.id || '');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
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
      <Field label="Department"><input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operations" /></Field>
      <Field label="Location"><input className={inputClass} style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 123 Anytown US" /></Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow />
    </form>
  );
}

export function FormPerson({ departments, onSave }) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
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
      <SaveRow />
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

export function FormTeamMember({ people, onSave }) {
  const [personId, setPersonId] = useState(people[0]?.id || '');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try { if (personId && role) await onSave(personId, role); } catch (err) { setError(err.message); }
    }}>
      <Field label="Person">
        <select className={inputClass} style={inputStyle} value={personId} onChange={(e) => setPersonId(e.target.value)}>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
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

export function FormInitiative({ people, onSave }) {
  const [vals, setVals] = useState({
    name: '', description: '', goLiveDate: '', budget: '', useCase: '', expectedBenefits: '', changeOwnerId: '', projectManagerId: '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setVals({ ...vals, [k]: e.target.value });
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try { if (vals.name) await onSave(vals); } catch (err) { setError(err.message); }
    }}>
      <Field label="Initiative Name"><input className={inputClass} style={inputStyle} value={vals.name} onChange={set('name')} placeholder="e.g. Salesforce Rollout" autoFocus /></Field>
      <Field label="Description"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.description} onChange={set('description')} /></Field>
      <Field label="Proposed Go Live Date"><input type="date" className={inputClass} style={inputStyle} value={vals.goLiveDate} onChange={set('goLiveDate')} /></Field>
      <Field label="Budget"><input type="number" className={inputClass} style={inputStyle} value={vals.budget} onChange={set('budget')} placeholder="e.g. 45000" /></Field>
      <Field label="Use Case"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.useCase} onChange={set('useCase')} /></Field>
      <Field label="Expected Benefits"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.expectedBenefits} onChange={set('expectedBenefits')} /></Field>
      <Field label="Change Owner">
        <select className={inputClass} style={inputStyle} value={vals.changeOwnerId} onChange={set('changeOwnerId')}>
          <option value="">Select</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Project Manager">
        <select className={inputClass} style={inputStyle} value={vals.projectManagerId} onChange={set('projectManagerId')}>
          <option value="">Select</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow />
    </form>
  );
}

export function FormImpact({ departments, onSave }) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [headcount, setHeadcount] = useState('');
  const [currentSystem, setCurrentSystem] = useState('');
  const [currentProcess, setCurrentProcess] = useState('');
  const [futureSystem, setFutureSystem] = useState('');
  const [futureProcess, setFutureProcess] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState({ org: 'low', people: 'low', process: 'low', system: 'low', environment: 'low' });
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');
  const SEVERITY_COLOR = { low: C.green, medium: C.amber, high: C.coral };
  function toggleTag(t) { setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]); }
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        await onSave({
          departmentId, headcount: Number(headcount) || 0, currentSystem, currentProcess,
          futureSystem, futureProcess, description, severity, tags,
        });
      } catch (err) { setError(err.message); }
    }}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Department">
          {departments.length === 0 ? (
            <p className="text-xs" style={{ color: C.sub }}>Add a Department in System Admin first.</p>
          ) : (
            <select className={inputClass} style={inputStyle} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </Field>
        <Field label="# Impacted"><input type="number" className={inputClass} style={inputStyle} value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="e.g. 30" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Current State — System"><input className={inputClass} style={inputStyle} value={currentSystem} onChange={(e) => setCurrentSystem(e.target.value)} /></Field>
        <Field label="Future State — System"><input className={inputClass} style={inputStyle} value={futureSystem} onChange={(e) => setFutureSystem(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Current State — Process"><input className={inputClass} style={inputStyle} value={currentProcess} onChange={(e) => setCurrentProcess(e.target.value)} /></Field>
        <Field label="Future State — Process"><input className={inputClass} style={inputStyle} value={futureProcess} onChange={(e) => setFutureProcess(e.target.value)} /></Field>
      </div>
      <Field label="Impact Description"><textarea rows={2} className={inputClass} style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Field label="Severity">
        <div className="space-y-2">
          {Object.keys(severity).map((k) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-xs capitalize font-medium" style={{ color: C.ink }}>{k}</span>
              <div className="flex gap-1.5">
                {['low', 'medium', 'high'].map((lvl) => (
                  <button type="button" key={lvl} onClick={() => setSeverity({ ...severity, [k]: lvl })} className="w-6 h-6 rounded-full border-2" style={{ background: severity[k] === lvl ? SEVERITY_COLOR[lvl] : '#fff', borderColor: SEVERITY_COLOR[lvl] }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Field>
      <Field label="Intervention"><div>{TAG_OPTIONS.map((t) => <Pill key={t} active={tags.includes(t)} color={C.coral} onClick={() => toggleTag(t)}>{t}</Pill>)}</div></Field>
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow />
    </form>
  );
}

export function FormStakeholder({ people, onSave }) {
  const [personId, setPersonId] = useState(people[0]?.id || '');
  const [role, setRole] = useState('');
  const [raci, setRaci] = useState({ r: false, a: false, c: false, i: false });
  const [error, setError] = useState('');
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try { await onSave({ personId, role, raci }); } catch (err) { setError(err.message); }
    }}>
      <Field label="Person">
        {people.length === 0 ? (
          <p className="text-xs" style={{ color: C.sub }}>Add People in System Admin first.</p>
        ) : (
          <select className={inputClass} style={inputStyle} value={personId} onChange={(e) => setPersonId(e.target.value)}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </Field>
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
      <SaveRow />
    </form>
  );
}

export function FormLearningNeed({ impacts, deptName, onSave }) {
  const [impactId, setImpactId] = useState(impacts[0]?.id || '');
  const [team, setTeam] = useState('');
  const [goal, setGoal] = useState('');
  const [headcount, setHeadcount] = useState('');
  const [type, setType] = useState('Training');
  const [sessions, setSessions] = useState(1);
  const [hours, setHours] = useState(0.5);
  const [error, setError] = useState('');
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        await onSave({ impactId, team, goal, headcount: Number(headcount) || 0, type, sessions: Number(sessions), hours: Number(hours) });
      } catch (err) { setError(err.message); }
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
      {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
      <SaveRow />
    </form>
  );
}

export function FormComms({ initiative, impacts, deptName, onSave }) {
  const [impactId, setImpactId] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [audience, setAudience] = useState([]);
  const [tone, setTone] = useState('professional');
  const [channel, setChannel] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [generated, setGenerated] = useState('');
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
      <SaveRow label="Save Comms" />
    </form>
  );
}
