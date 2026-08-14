import { useEffect, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { C, BODY } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';

function escapeIlike(value) {
  return String(value || '').replace(/[%_\\]/g, '\\$&');
}

export default function GlobalSearch({ onNavigate }) {
  const { activeWorkspaceId } = useWorkspace();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const wrapRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeWorkspaceId || debounced.length < 2) {
        setGroups([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const pattern = `%${escapeIlike(debounced)}%`;
      const ws = activeWorkspaceId;
      const [initiatives, requirements, programs, people] = await Promise.all([
        supabase
          .from('initiatives')
          .select('id, name, description')
          .eq('workspace_id', ws)
          .or(`name.ilike."${pattern}",description.ilike."${pattern}"`)
          .limit(8),
        supabase
          .from('requirements')
          .select('id, description')
          .eq('workspace_id', ws)
          .ilike('description', pattern)
          .limit(8),
        supabase
          .from('programs')
          .select('id, name')
          .eq('workspace_id', ws)
          .ilike('name', pattern)
          .limit(8),
        supabase
          .from('people')
          .select('id, name')
          .eq('workspace_id', ws)
          .ilike('name', pattern)
          .limit(8),
      ]);
      if (cancelled) return;

      const next = [];
      if (initiatives.data?.length) {
        next.push({
          label: 'Initiatives',
          items: initiatives.data.map((i) => ({
            id: i.id,
            title: i.name,
            subtitle: i.description || 'Initiative',
            onSelect: () => onNavigate?.({ section: 'initiatives', initiativeId: i.id }),
          })),
        });
      }
      if (programs.data?.length) {
        next.push({
          label: 'Programs',
          items: programs.data.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: 'Program',
            onSelect: () => onNavigate?.({ section: 'program' }),
          })),
        });
      }
      if (requirements.data?.length) {
        next.push({
          label: 'Requirements',
          items: requirements.data.map((r) => ({
            id: r.id,
            title: r.description || 'Requirement',
            subtitle: 'Requirement',
            onSelect: () => onNavigate?.({ section: 'requirements' }),
          })),
        });
      }
      if (people.data?.length) {
        next.push({
          label: 'People',
          items: people.data.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: 'Person',
            onSelect: () => onNavigate?.({ section: 'settings', adminTab: 'people' }),
          })),
        });
      }
      setGroups(next);
      setLoading(false);
      setOpen(true);
    })();
    return () => { cancelled = true; };
  }, [debounced, activeWorkspaceId, onNavigate]);

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div className="relative w-full" ref={wrapRef} style={BODY}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{ color: C.sub }} />
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search initiatives, programs, people…"
        className="w-full rounded-full text-sm pl-9 pr-3 py-1.5 outline-none border"
        style={{ background: C.bg, color: C.ink, borderColor: C.border }}
      />
      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border z-50 max-h-80 overflow-y-auto"
          style={{ borderColor: C.border }}
        >
          {loading ? (
            <div className="px-4 py-3 text-xs flex items-center gap-2" style={{ color: C.sub }}>
              <Loader2 size={14} className="animate-spin" /> Searching…
            </div>
          ) : groups.length === 0 ? (
            <div className="px-4 py-3 text-xs" style={{ color: C.sub }}>No matches in this workspace.</div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div
                  className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide border-b sticky top-0 bg-white"
                  style={{ color: C.sub, borderColor: C.border }}
                >
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50"
                    onClick={() => {
                      item.onSelect();
                      setQuery('');
                      setOpen(false);
                    }}
                  >
                    <div className="text-sm font-semibold truncate" style={{ color: C.ink }}>{item.title}</div>
                    <div className="text-[11px] truncate" style={{ color: C.sub }}>{item.subtitle}</div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
