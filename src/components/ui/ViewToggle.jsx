import { LayoutGrid, List, Columns3 } from 'lucide-react';
import { C } from '../../lib/constants';

const ICONS = {
  tiles: LayoutGrid,
  list: List,
  board: Columns3,
};

const TITLES = {
  tiles: 'Tile view',
  list: 'List view',
  board: 'Board view',
};

/**
 * Compact tiles | list (| board) switcher.
 * @param {'tiles'|'list'|'board'} value
 * @param {(next: string) => void} onChange
 * @param {Array<'tiles'|'list'|'board'>} modes
 */
export default function ViewToggle({
  value = 'tiles',
  onChange,
  modes = ['tiles', 'list'],
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: C.bg }}>
      {modes.map((mode) => {
        const Icon = ICONS[mode];
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange?.(mode)}
            className="p-1.5 rounded-md"
            style={
              active
                ? { background: '#fff', color: C.ink, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                : { color: C.sub }
            }
            title={TITLES[mode]}
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}
