import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, ChevronDown, Check, Plus, Pencil,
} from 'lucide-react';
import { C, HEAD, BODY, tint, initials } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Modal from '../ui/Modal';
import { FormWorkspace } from '../forms/AdminForms';
import GlobalSearch from './GlobalSearch';

export default function TopNav({ onNavigate }) {
  const { profile } = useAuth();
  const {
    workspaces, activeWorkspace, activeWorkspaceId, planTier,
    switchWorkspace, createWorkspace, renameWorkspace,
  } = useWorkspace();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const isOwner = profile?.role === 'owner';

  const handleCreateWorkspace = async (name) => {
    await createWorkspace(name);
    setModal(null);
  };

  const startRename = (w, e) => {
    e.stopPropagation();
    setRenamingId(w.id);
    setRenameValue(w.name);
    setRenameError('');
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const current = workspaces.find((w) => w.id === renamingId);
    const next = renameValue.trim();
    if (!next || next === current?.name) {
      setRenamingId(null);
      setRenameError('');
      return;
    }
    try {
      await renameWorkspace(renamingId, next);
      setRenamingId(null);
      setRenameError('');
    } catch (err) {
      setRenameError(err.message);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 px-6 py-3.5 bg-white border-b shrink-0" style={{ ...BODY, borderColor: C.border }}>
        <Link to="/app" className="font-extrabold tracking-tight text-lg no-underline" style={{ ...HEAD, color: C.ink }}>
          ChangeView
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => { setPickerOpen(!pickerOpen); setRenamingId(null); }}
            className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{ background: tint(C.purple, '14'), color: C.purple }}
          >
            <Briefcase size={14} />
            {activeWorkspace?.name || 'Workspace'}
            <ChevronDown size={14} className={pickerOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {pickerOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border" style={{ borderColor: C.border }}>
              <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide border-b" style={{ color: C.sub, borderColor: C.border }}>
                Your Workspaces
              </div>
              {workspaces.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-1 px-2 py-1 hover:bg-gray-50"
                >
                  {renamingId === w.id ? (
                    <input
                      autoFocus
                      className="flex-1 text-sm px-2 py-1.5 rounded-lg outline-none border"
                      style={{ borderColor: C.border, color: C.ink }}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitRename();
                        }
                        if (e.key === 'Escape') {
                          setRenamingId(null);
                          setRenameError('');
                        }
                      }}
                      onBlur={commitRename}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => { switchWorkspace(w.id); setPickerOpen(false); }}
                      className="flex-1 flex items-center justify-between px-2 py-1.5 text-sm text-left min-w-0"
                    >
                      <span className="truncate" style={{ color: w.id === activeWorkspaceId ? C.ink : C.sub, fontWeight: w.id === activeWorkspaceId ? 700 : 500 }}>
                        {w.name}
                      </span>
                      {w.id === activeWorkspaceId && <Check size={14} className="shrink-0 ml-2" style={{ color: C.teal }} />}
                    </button>
                  )}
                  {isOwner && renamingId !== w.id && (
                    <button
                      type="button"
                      title="Rename workspace"
                      aria-label={`Rename ${w.name}`}
                      className="p-1.5 rounded-lg shrink-0"
                      style={{ color: C.sub }}
                      onClick={(e) => startRename(w, e)}
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              ))}
              {renameError && (
                <div className="px-4 py-2 text-[11px]" style={{ color: C.coral }}>{renameError}</div>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => { setModal('newWorkspace'); setPickerOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm border-t font-semibold"
                  style={{ color: C.purple, borderColor: C.border }}
                >
                  <Plus size={14} /> New workspace
                </button>
              )}
              {planTier === 'tier_1' && (
                <div className="px-4 py-2 text-[11px] border-t" style={{ color: C.sub, borderColor: C.border }}>
                  Tier 1 includes 1 workspace. Upgrade for unlimited.
                </div>
              )}
            </div>
          )}
        </div>

        <GlobalSearch onNavigate={onNavigate} />

        <button
          type="button"
          onClick={() => onNavigate?.({ section: 'profile' })}
          title="Profile"
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: C.purple }}
        >
          {initials(profile?.full_name || activeWorkspace?.name)}
        </button>
      </div>

      {modal === 'newWorkspace' && (
        <Modal title="New Workspace" onClose={() => setModal(null)}>
          <FormWorkspace onSave={handleCreateWorkspace} />
        </Modal>
      )}
    </>
  );
}
