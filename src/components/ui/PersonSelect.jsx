import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { C, inputClass, inputStyle, tint, assignableOptions } from '../../lib/constants';
import { Field } from './shared';

function personSubtitle(person, departments = []) {
  if (!person) return '';
  const title = person.title || '';
  const dept = person.departments?.name
    || person.department_name
    || departments.find((d) => d.id === person.department_id)?.name
    || '';
  if (title && dept) return `${title} · ${dept}`;
  return title || dept || '';
}

function matchesQuery(person, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    person.name,
    person.title,
    person.email,
    person.departments?.name,
    person.department_name,
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q);
}

function emitChange(onChange, id) {
  if (!onChange) return;
  // Drop-in compatible with <select onChange> / set('field') helpers.
  onChange({ target: { value: id } });
}

/**
 * Searchable person combobox. Replaces plain <select> person pickers.
 */
export default function PersonSelect({
  label,
  people = [],
  departments = [],
  loading = false,
  value = '',
  onChange,
  placeholder = 'Search people…',
  allowEmpty = true,
  emptyLabel = 'None',
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [menuRect, setMenuRect] = useState(null);

  const selected = useMemo(
    () => people.find((p) => p.id === value) || null,
    [people, value],
  );

  const assignable = useMemo(
    () => assignableOptions(people, value),
    [people, value],
  );

  const filtered = useMemo(
    () => assignable.filter((p) => matchesQuery(p, query)),
    [assignable, query],
  );

  const options = useMemo(() => {
    const rows = filtered.map((p) => ({ type: 'person', person: p, id: p.id }));
    if (allowEmpty && !query.trim()) {
      return [{ type: 'clear', id: '', label: emptyLabel }, ...rows];
    }
    return rows;
  }, [filtered, allowEmpty, query, emptyLabel]);

  useEffect(() => {
    if (!open) return undefined;
    const update = () => {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setMenuRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, query, filtered.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  function pick(id) {
    emitChange(onChange, id);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      setQuery('');
      e.preventDefault();
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      setHighlight((h) => Math.min(h + 1, Math.max(options.length - 1, 0)));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlight((h) => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const opt = options[highlight];
      if (opt) pick(opt.id);
      e.preventDefault();
    }
  }

  if (loading) {
    return (
      <Field label={label}>
        <p className="text-xs" style={{ color: C.sub }}>Loading people…</p>
      </Field>
    );
  }

  if (people.length === 0) {
    return (
      <Field label={label}>
        <p className="text-xs" style={{ color: C.sub }}>Add People in Settings first.</p>
      </Field>
    );
  }

  const inputValue = open ? query : (selected?.name || '');

  const menu = open && menuRect && createPortal(
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      className="fixed z-[80] max-h-60 overflow-y-auto rounded-2xl border bg-white shadow-lg py-1"
      style={{
        top: menuRect.top,
        left: menuRect.left,
        width: menuRect.width,
        borderColor: C.border,
      }}
    >
      {options.length === 0 ? (
        <div className="px-3.5 py-3 text-sm" style={{ color: C.sub }}>No matches</div>
      ) : options.map((opt, idx) => {
        const active = idx === highlight;
        if (opt.type === 'clear') {
          return (
            <button
              key="__clear"
              type="button"
              role="option"
              aria-selected={value === ''}
              className="w-full text-left px-3.5 py-2.5 text-sm"
              style={{
                background: active ? tint(C.purple, '12') : 'transparent',
                color: C.sub,
              }}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick('')}
            >
              {opt.label}
            </button>
          );
        }
        const sub = personSubtitle(opt.person, departments);
        return (
          <button
            key={opt.id}
            type="button"
            role="option"
            aria-selected={value === opt.id}
            className="w-full text-left px-3.5 py-2.5"
            style={{
              background: active || value === opt.id ? tint(C.purple, '12') : 'transparent',
            }}
            onMouseEnter={() => setHighlight(idx)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(opt.id)}
          >
            <div className="text-sm font-semibold truncate" style={{ color: C.ink }}>{opt.person.name}</div>
            {sub && (
              <div className="text-[11px] truncate mt-0.5" style={{ color: C.sub }}>{sub}</div>
            )}
          </button>
        );
      })}
    </div>,
    document.body,
  );

  return (
    <Field label={label}>
      <div ref={rootRef} className="relative">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: C.sub }}
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className={`${inputClass} pl-9 pr-16`}
          style={inputStyle}
          value={inputValue}
          placeholder={selected?.name || placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              className="p-1 rounded-full"
              style={{ color: C.sub }}
              title="Clear"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick('')}
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={14} style={{ color: C.sub }} />
        </div>
        {menu}
      </div>
    </Field>
  );
}
