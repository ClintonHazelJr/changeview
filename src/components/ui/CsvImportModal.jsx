import { useRef, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import { C, HEAD, BODY, tint } from '../../lib/constants';
import Modal from './Modal';
import { useCsvImport } from '../../hooks/useCsvImport';

/**
 * Shared Bulk Upload modal: template download, file pick, best-effort import, failure report.
 */
export default function CsvImportModal({
  title = 'Bulk Upload',
  headers,
  exampleRow,
  templateFilename,
  mapRow,
  importRow,
  onClose,
  onComplete,
  /** Optional controls rendered above the file picker (e.g. Initiative select). */
  preamble = null,
  /** When false, Upload is disabled (e.g. missing initiative). */
  canImport = true,
  disabledReason = '',
}) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const {
    busy, result, fileError, runFile, downloadTemplate, downloadFailures, reset,
  } = useCsvImport({
    headers,
    exampleRow,
    templateFilename,
    mapRow,
    importRow,
  });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    setFileName(file?.name || '');
    if (!file) return;
    const summary = await runFile(file);
    if (summary && onComplete) {
      await onComplete(summary);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Modal title={title} onClose={onClose} wide>
      <div style={BODY}>
        <p className="text-sm mb-4" style={{ color: C.sub }}>
          Download the template, fill it in, then upload. Valid rows import even if some rows fail.
        </p>

        {preamble}

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full border"
            style={{ borderColor: C.border, color: C.ink, background: '#fff' }}
          >
            <Download size={15} /> Download Template
          </button>
          <label
            className={`inline-flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2 rounded-full cursor-pointer ${(!canImport || busy) ? 'opacity-40 pointer-events-none' : ''}`}
            style={{ background: C.purple }}
            title={!canImport ? disabledReason : undefined}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {busy ? 'Importing…' : 'Upload CSV'}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={!canImport || busy}
              onChange={handleFile}
            />
          </label>
        </div>

        {!canImport && disabledReason && (
          <p className="text-xs mb-3" style={{ color: C.coral }}>{disabledReason}</p>
        )}
        {fileName && !busy && !result && !fileError && (
          <p className="text-xs mb-3" style={{ color: C.sub }}>Selected: {fileName}</p>
        )}
        {fileError && (
          <div className="rounded-2xl border px-4 py-3 mb-4 text-sm" style={{ borderColor: tint(C.coral, '40'), background: tint(C.coral, '10'), color: C.coral }}>
            {fileError}
          </div>
        )}

        {result && (
          <div className="rounded-2xl border p-4" style={{ borderColor: C.border, background: C.bg }}>
            <div className="text-sm font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
              {result.importedCount} imported, {result.failedCount} failed
            </div>
            {result.failedCount > 0 && (
              <>
                <div className="flex items-center justify-between gap-2 mb-2 mt-3">
                  <div className="text-xs font-semibold" style={{ color: C.sub }}>Failed rows</div>
                  <button
                    type="button"
                    onClick={downloadFailures}
                    className="text-xs font-bold inline-flex items-center gap-1"
                    style={{ color: C.purple }}
                  >
                    <Download size={12} /> Download failures CSV
                  </button>
                </div>
                <div className="max-h-48 overflow-auto rounded-xl border bg-white" style={{ borderColor: C.border }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ color: C.sub, background: C.bg }}>
                        <th className="text-left px-3 py-2 font-semibold">Row</th>
                        <th className="text-left px-3 py-2 font-semibold">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.failed.map((f) => (
                        <tr key={f.rowNumber} className="border-t" style={{ borderColor: C.border }}>
                          <td className="px-3 py-2 align-top font-semibold" style={{ color: C.ink }}>{f.rowNumber}</td>
                          <td className="px-3 py-2" style={{ color: C.coral }}>{f.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => { reset(); setFileName(''); }}
                className="text-sm font-semibold px-4 py-2 rounded-full border"
                style={{ borderColor: C.border, color: C.sub }}
              >
                Upload another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-bold text-white px-4 py-2 rounded-full"
                style={{ background: C.purple }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
