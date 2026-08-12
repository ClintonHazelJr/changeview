import {
  LayoutDashboard, Layers, LayoutGrid, ClipboardList,
  CalendarRange, BarChart3, Settings,
} from 'lucide-react';
import { C, HEAD, tint } from '../../lib/constants';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'program', label: 'Program', icon: Layers },
  { key: 'initiatives', label: 'Initiatives', icon: LayoutGrid },
  { key: 'requirements', label: 'Requirements', icon: ClipboardList },
  { key: 'schedule', label: 'Schedule', icon: CalendarRange },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

export default function AppSidebar({ section, setSection }) {
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
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-2 border-t mt-auto" style={{ borderColor: C.border }}>
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
