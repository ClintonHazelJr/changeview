import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, Search, Briefcase, ChevronDown, Check, Plus, Settings, LayoutGrid, LogOut,
} from 'lucide-react';
import { C, HEAD, BODY, tint, initials } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Modal from '../ui/Modal';
import { FormWorkspace } from '../forms/AdminForms';

export default function TopNav({ section, setSection }) {
  const { profile, signOut } = useAuth();
  const { workspaces, activeWorkspace, activeWorkspaceId, planTier, switchWorkspace, createWorkspace } = useWorkspace();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const navigate = useNavigate();

  const handleCreateWorkspace = async (name) => {
    await createWorkspace(name);
    setModal(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <div className="flex items-center gap-4 px-6 py-3.5 bg-white border-b" style={{ ...BODY, borderColor: C.border }}>
        <Menu size={20} style={{ color: C.sub }} />
        <Link to="/app" className="font-extrabold tracking-tight text-lg no-underline" style={{ ...HEAD, color: C.ink }}>
          ChangeView
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen(!pickerOpen)}
            className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{ background: tint(C.purple, '14'), color: C.purple }}
          >
            <Briefcase size={14} />
            {activeWorkspace?.name || 'Workspace'}
            <ChevronDown size={14} className={pickerOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {pickerOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border" style={{ borderColor: C.border }}>
              <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide border-b" style={{ color: C.sub, borderColor: C.border }}>
                Your Workspaces
              </div>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => { switchWorkspace(w.id); setPickerOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 text-left"
                >
                  <span style={{ color: w.id === activeWorkspaceId ? C.ink : C.sub, fontWeight: w.id === activeWorkspaceId ? 700 : 500 }}>{w.name}</span>
                  {w.id === activeWorkspaceId && <Check size={14} style={{ color: C.teal }} />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setModal('newWorkspace'); setPickerOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm border-t font-semibold"
                style={{ color: C.purple, borderColor: C.border }}
              >
                <Plus size={14} /> New workspace
              </button>
              {planTier === 'tier_1' && (
                <div className="px-4 py-2 text-[11px] border-t" style={{ color: C.sub, borderColor: C.border }}>
                  Tier 1 includes 1 workspace. Upgrade for unlimited.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 bg-gray-50 rounded-full p-1">
          <button
            type="button"
            onClick={() => setSection('admin')}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: section === 'admin' ? '#fff' : 'transparent',
              color: section === 'admin' ? C.ink : C.sub,
              boxShadow: section === 'admin' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <Settings size={13} /> System Admin
          </button>
          <button
            type="button"
            onClick={() => setSection('initiatives')}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: section === 'initiatives' ? '#fff' : 'transparent',
              color: section === 'initiatives' ? C.ink : C.sub,
              boxShadow: section === 'initiatives' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <LayoutGrid size={13} /> Initiatives
          </button>
        </div>

        <div className="flex-1 max-w-md ml-2 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.sub }} />
          <input placeholder="Search" disabled className="w-full rounded-full text-sm pl-9 pr-3 py-1.5 outline-none" style={{ background: C.bg, color: C.sub }} />
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={handleSignOut} className="text-xs flex items-center gap-1" style={{ color: C.sub }} title="Sign out">
            <LogOut size={14} />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: C.purple }}>
            {initials(profile?.full_name || activeWorkspace?.name)}
          </div>
        </div>
      </div>

      {modal === 'newWorkspace' && (
        <Modal title="New Workspace" onClose={() => setModal(null)}>
          <FormWorkspace onSave={handleCreateWorkspace} />
        </Modal>
      )}
    </>
  );
}
