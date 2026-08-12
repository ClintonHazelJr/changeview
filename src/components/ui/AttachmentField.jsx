import { useRef } from 'react';
import { Paperclip, X } from 'lucide-react';
import { C } from '../../lib/constants';

/** Pending (local File) or saved attachment row with file_name / id. */
export function AttachmentList({ items, onRemove, onDownload }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {items.map((item) => {
        const key = item.id || item.localKey;
        const name = item.file_name || item.name;
        return (
          <li
            key={key}
            className="flex items-center gap-2 text-xs rounded-lg px-2 py-1"
            style={{ background: C.bg, color: C.ink }}
          >
            <button
              type="button"
              className="flex-1 text-left truncate hover:underline"
              style={{ color: item.storage_path ? C.purple : C.ink }}
              onClick={() => item.storage_path && onDownload?.(item)}
              title={name}
            >
              {name}
              {item.pending ? ' (pending)' : ''}
            </button>
            <button
              type="button"
              aria-label={`Remove ${name}`}
              className="p-0.5 rounded hover:opacity-70"
              style={{ color: C.sub }}
              onClick={() => onRemove(item)}
            >
              <X size={14} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function AttachButton({ onFiles, disabled, label = 'Attach document' }) {
  const inputRef = useRef(null);
  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="p-1.5 rounded-lg border hover:opacity-80 disabled:opacity-40"
        style={{ borderColor: C.border, color: C.sub }}
      >
        <Paperclip size={14} />
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files || [])];
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}

export function FieldWithAttach({ label, children, onFiles, disabled }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold" style={{ color: C.sub }}>{label}</label>
        <AttachButton onFiles={onFiles} disabled={disabled} />
      </div>
      {children}
    </div>
  );
}
