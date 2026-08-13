import {
  LayoutDashboard, Layers, LayoutGrid, ClipboardList,
  CalendarRange, BarChart3, Settings, Users, CheckSquare,
} from 'lucide-react';
import { C, HEAD, tint } from '../../lib/constants';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'program', label: 'Program', icon: Layers },
  { key: 'initiatives', label: 'Initiatives', icon: LayoutGrid },
  { key: 'requirements', label: 'Requirements', icon: ClipboardList },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, paid: true },
  { key: 'schedule', label: 'Schedule', icon: CalendarRange, paid: true },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

export default function AppSidebar({ section, setSection }) {
  const { hasPaidFeatures: paid } = useWorkspace();
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';

  return (
    <aside
      className="w-56 bg-white border-r flex flex-col shrink-0"
      style={{ borderColor: C.border, minHeight: 0 }}
    >
      <div className="px-4 pt-5 pb-3">
        <div className="text-[11px] font-bold tracking-wide uppercase" style={{ color: C.sub }}>Navigate</div>
      </div>
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = section === item.key;
          const locked = item.paid && !paid;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className="w-full flex items-center gap-2.5 pl-3 pr-2.5 py-2.5 rounded-xl text-sm text-left"
              style={{
                background: active ? tint(C.purple, '12') : 'transparent',
                color: active ? C.ink : C.sub,
                fontWeight: active ? 700 : 500,
              }}
            >
              <item.icon size={16} style={{ color: active ? C.purple : C.sub }} />
              <span className="flex-1">{item.label}</span>
              {locked && (
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: tint(C.purple, '14'), color: C.purple }}>
                  Pro
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-2 border-t mt-auto space-y-0.5" style={{ borderColor: C.border }}>
        <button
          type="button"
          onClick={() => setSection('users')}
          className="w-full flex items-center gap-2.5 pl-3 pr-2.5 py-2.5 rounded-xl text-sm text-left"
          style={{
            background: section === 'users' ? tint(C.purple, '12') : 'transparent',
            color: section === 'users' ? C.ink : C.sub,
            fontWeight: section === 'users' ? 700 : 500,
          }}
        >
          <Users size={16} style={{ color: section === 'users' ? C.purple : C.sub }} />
          <span className="flex-1" style={HEAD}>Users</span>
          {(!paid || !isOwner) && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: tint(C.purple, '14'), color: C.purple }}>
              {!paid ? 'Pro' : 'Owner'}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSection('settings')}
          className="w-full flex items-center gap-2.5 pl-3 pr-2.5 py-2.5 rounded-xl text-sm text-left"
          style={{
            background: section === 'settings' ? tint(C.purple, '12') : 'transparent',
            color: section === 'settings' ? C.ink : C.sub,
            fontWeight: section === 'settings' ? 700 : 500,
          }}
        >
          <Settings size={16} style={{ color: section === 'settings' ? C.purple : C.sub }} />
          <span style={HEAD}>Settings</span>
        </button>
      </div>
    </aside>
  );
}
