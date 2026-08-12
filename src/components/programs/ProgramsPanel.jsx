import { useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { C, HEAD, BODY, tint } from '../../lib/constants';
import { usePrograms } from '../../hooks/usePrograms';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Modal from '../ui/Modal';
import { FormProgram } from '../forms/AdminForms';
import { ListCard } from '../ui/shared';

export default function ProgramsPanel() {
  const { activeWorkspace } = useWorkspace();
  const { programs, orgs, addProgram, updateProgram } = usePrograms();
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);

  const orgName = (id) => orgs.find((o) => o.id === id)?.name || '—';

  return (
    <div className="flex-1 p-8 max-w-4xl w-full mx-auto overflow-y-auto" style={BODY}>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-xl font-extrabold" style={{ ...HEAD, color: C.ink }}>Programs — {activeWorkspace?.name}</h2>
        <button
          type="button"
          onClick={() => { setEditing(null); setModal('program'); }}
          disabled={orgs.length === 0}
          className="flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2.5 rounded-full disabled:opacity-40 shadow-sm"
          style={{ background: C.purple }}
        >
          <Plus size={15} /> Add Program
        </button>
      </div>
      <p className="text-sm mb-5" style={{ color: C.sub }}>
        {orgs.length === 0
          ? 'Add an Org in Settings first, then create Programs to group Initiatives.'
          : 'Programs sit under an Org and own Initiatives.'}
      </p>

      {programs.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: tint(C.purple, '16') }}>
            <Layers size={20} style={{ color: C.purple }} />
          </div>
          <div className="text-sm" style={{ color: C.sub }}>No programs yet.</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {programs.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setEditing(p); setModal('program'); }}
              className="text-left"
            >
              <ListCard
                icon={Layers}
                color={C.purple}
                title={p.name}
                subtitle={orgName(p.organization_id)}
                tag={p.status || 'planning'}
              />
            </button>
          ))}
        </div>
      )}

      {modal === 'program' && (
        <Modal title={editing ? 'Edit Program' : 'Add Program'} onClose={() => setModal(null)} wide>
          <FormProgram
            orgs={orgs}
            initial={editing}
            onSave={async (vals) => {
              if (editing) await updateProgram(editing.id, vals);
              else await addProgram(vals);
              setModal(null);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
