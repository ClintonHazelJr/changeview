import { CheckSquare } from 'lucide-react';
import { C, HEAD, BODY, tint } from '../../lib/constants';
import { useWorkspace } from '../../contexts/WorkspaceContext';

/** Placeholder for the paid Tasks / Planning module. */
export default function TasksPanel() {
  const { activeWorkspace } = useWorkspace();
  return (
    <div className="flex-1 p-8 max-w-3xl w-full mx-auto overflow-y-auto" style={BODY}>
      <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
        Tasks — {activeWorkspace?.name}
      </h2>
      <p className="text-sm mb-8" style={{ color: C.sub }}>
        Track delivery work for this workspace. Full board view is on the way.
      </p>
      <div className="text-center py-16 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: tint(C.purple, '16') }}
        >
          <CheckSquare size={22} style={{ color: C.purple }} />
        </div>
        <div className="text-sm font-bold mb-1" style={{ color: C.ink }}>Tasks workspace is ready</div>
        <div className="text-sm max-w-sm mx-auto" style={{ color: C.sub }}>
          Your plan includes Tasks. A Kanban-style board will land here next — nothing to configure yet.
        </div>
      </div>
    </div>
  );
}
