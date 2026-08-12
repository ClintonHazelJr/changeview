import { useMemo, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { C, HEAD, BODY, tint, SEVERITY_COLOR } from '../../lib/constants';
import { useRequirements } from '../../hooks/useRequirements';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Modal from '../ui/Modal';
import { FormRequirement } from '../forms/AdminForms';

export default function RequirementsPanel() {
  const { activeWorkspace } = useWorkspace();
  const { requirements, initiatives, people, impacts, saveRequirement } = useRequirements();
  const [groupByInitiative, setGroupByInitiative] = useState(true);
  const [filterInitiative, setFilterInitiative] = useState('');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);

  const initiativeName = (id) => initiatives.find((i) => i.id === id)?.name || '—';
  const personName = (id) => people.find((p) => p.id === id)?.name || '—';

  const filtered = useMemo(() => {
    if (!filterInitiative) return requirements;
    return requirements.filter((r) => r.initiative_id === filterInitiative);
  }, [requirements, filterInitiative]);

  const groups = useMemo(() => {
    if (!groupByInitiative) return [{ key: 'all', label: 'All requirements', items: filtered }];
    const map = new Map();
    filtered.forEach((r) => {
      const key = r.initiative_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: initiativeName(key),
      items,
    }));
  }, [filtered, groupByInitiative, initiatives]);

  return (
    <div className="flex-1 p-8 max-w-4xl w-full mx-auto overflow-y-auto" style={BODY}>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-xl font-extrabold" style={{ ...HEAD, color: C.ink }}>Requirements — {activeWorkspace?.name}</h2>
        <button
          type="button"
          onClick={() => { setEditing(null); setModal('req'); }}
          disabled={initiatives.length === 0}
          className="flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2.5 rounded-full disabled:opacity-40 shadow-sm"
          style={{ background: C.amber }}
        >
          <Plus size={15} /> Add Requirement
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: C.sub }}>
        {initiatives.length === 0
          ? 'Create an Initiative first, then capture Requirements against it.'
          : 'Track draft, approved, and rejected requirements per Initiative.'}
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          className="border rounded-full text-xs font-semibold px-3 py-2 outline-none"
          style={{ borderColor: C.border, color: C.ink }}
          value={filterInitiative}
          onChange={(e) => setFilterInitiative(e.target.value)}
        >
          <option value="">All initiatives</option>
          {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs font-semibold" style={{ color: C.sub }}>
          <input type="checkbox" checked={groupByInitiative} onChange={(e) => setGroupByInitiative(e.target.checked)} />
          Group by Initiative
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: tint(C.amber, '16') }}>
            <ClipboardList size={20} style={{ color: C.amber }} />
          </div>
          <div className="text-sm" style={{ color: C.sub }}>No requirements yet.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.key}>
              {groupByInitiative && (
                <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>{g.label}</div>
              )}
              <div className="space-y-2">
                {g.items.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setEditing(r); setModal('req'); }}
                    className="w-full bg-white rounded-2xl p-4 border shadow-sm text-left hover:shadow-md transition-shadow"
                    style={{ borderColor: C.border }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="text-sm font-bold" style={{ color: C.ink }}>{r.description}</div>
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded-full capitalize shrink-0"
                        style={{ background: tint(SEVERITY_COLOR[r.priority] || C.sub, '20'), color: SEVERITY_COLOR[r.priority] || C.sub }}
                      >
                        {r.priority || '—'}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: C.sub }}>
                      {initiativeName(r.initiative_id)} · {r.status} · Author {personName(r.author_id)} · Approver {personName(r.business_approver_id)}
                      {r.impactIds?.length ? ` · ${r.impactIds.length} impact${r.impactIds.length === 1 ? '' : 's'}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'req' && (
        <Modal title={editing ? 'Edit Requirement' : 'Add Requirement'} onClose={() => setModal(null)} wide>
          <FormRequirement
            initiatives={initiatives}
            people={people}
            impacts={impacts}
            initial={editing}
            onSave={async (vals) => {
              await saveRequirement(vals, editing?.id || null);
              setModal(null);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
