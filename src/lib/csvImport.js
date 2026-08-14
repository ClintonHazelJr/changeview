/** Shared CSV parsing / template helpers for bulk import. */

/**
 * Parse a CSV string into { headers, rows } where each row is { [header]: value }.
 * Supports quoted fields and "" escapes. Row numbers for data rows start at 2 (after header).
 */
export function parseCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  const lines = splitCsvLines(raw);
  if (!lines.length) {
    throw new Error('CSV is empty.');
  }
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  if (!headers.length || headers.every((h) => !h)) {
    throw new Error('CSV header row is missing.');
  }
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] != null ? String(cells[idx]).trim() : '';
    });
    // Skip completely blank data rows
    if (Object.values(obj).every((v) => !v)) continue;
    rows.push({ rowNumber: i + 1, values: obj });
  }
  return { headers, rows };
}

function splitCsvLines(text) {
  const lines = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      inQuotes = !inQuotes;
      cur += ch;
      continue;
    }
    if ((ch === '\n' || (ch === '\r' && next === '\n')) && !inQuotes) {
      if (ch === '\r') i += 1;
      lines.push(cur);
      cur = '';
      continue;
    }
    if (ch === '\r' && !inQuotes) {
      lines.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.length) lines.push(cur);
  return lines;
}

function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

export function assertExactHeaders(actualHeaders, expectedHeaders) {
  const actual = (actualHeaders || []).map((h) => String(h || '').trim()).filter(Boolean);
  const expected = expectedHeaders;
  const missing = expected.filter((h) => !actual.includes(h));
  const unexpected = actual.filter((h) => !expected.includes(h));
  if (!missing.length && !unexpected.length) return;
  const parts = [];
  if (unexpected.length) {
    parts.push(
      `Column '${unexpected[0]}' not recognized, expected ${expected.map((h) => `'${h}'`).join(', ')}`,
    );
  }
  if (missing.length) {
    parts.push(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.map((h) => `'${h}'`).join(', ')}`);
  }
  throw new Error(parts.join('. '));
}

export function buildTemplateCsv(headers, exampleRow) {
  const escape = (v) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const headerLine = headers.map(escape).join(',');
  const exampleLine = headers.map((h) => escape(exampleRow?.[h] ?? '')).join(',');
  return `${headerLine}\n${exampleLine}\n`;
}

export function downloadTextFile(filename, contents, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildFailuresCsv(failedRows, headers) {
  const cols = ['Row', ...headers, 'Error'];
  const escape = (v) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [cols.map(escape).join(',')];
  failedRows.forEach((f) => {
    lines.push(
      [
        f.rowNumber,
        ...headers.map((h) => f.values?.[h] ?? ''),
        f.reason,
      ].map(escape).join(','),
    );
  });
  return `${lines.join('\n')}\n`;
}

/** Case-insensitive exact name match against list items' `name` (or custom key). */
export function findByName(list, name, nameKey = 'name') {
  const needle = String(name || '').trim().toLowerCase();
  if (!needle) return null;
  const matches = (list || []).filter(
    (item) => String(item?.[nameKey] || '').trim().toLowerCase() === needle,
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return { ambiguous: true, matches };
  return null;
}

/**
 * Match a Person by name, or by email when the value is an email / name collides.
 */
export function findPerson(people, value) {
  const needle = String(value || '').trim();
  if (!needle) return null;
  const lower = needle.toLowerCase();
  const byName = (people || []).filter(
    (p) => String(p.name || '').trim().toLowerCase() === lower,
  );
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) {
    const byEmailAmong = byName.filter(
      (p) => String(p.email || '').trim().toLowerCase() === lower,
    );
    if (byEmailAmong.length === 1) return byEmailAmong[0];
    return {
      ambiguous: true,
      reason: `Multiple people named '${needle}'; use their email in the Person column to disambiguate`,
    };
  }
  const byEmail = (people || []).filter(
    (p) => String(p.email || '').trim().toLowerCase() === lower,
  );
  if (byEmail.length === 1) return byEmail[0];
  if (byEmail.length > 1) {
    return { ambiguous: true, reason: `Multiple people with email '${needle}'` };
  }
  return null;
}

export function parseYesNo(value, { blankMeans = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return blankMeans;
  const v = raw.toLowerCase();
  if (['y', 'yes', 'true', 't', '1'].includes(v)) return true;
  if (['n', 'no', 'false', 'f', '0'].includes(v)) return false;
  throw new Error(`Invalid Y/N value '${value}' (use Y/N or TRUE/FALSE)`);
}

/** Accept YYYY-MM-DD; also common slash/dash formats that parse unambiguously. */
export function parseImportDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid date '${value}'`);
    return raw;
  }
  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const iso = `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid date '${value}'`);
    return iso;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date '${value}' (use YYYY-MM-DD)`);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return iso;
}

export function requireEnum(value, allowed, { field, defaultValue = undefined } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`${field} is required`);
  }
  const lower = raw.toLowerCase();
  const match = allowed.find((a) => a.toLowerCase() === lower);
  if (!match) {
    throw new Error(`Invalid ${field} '${value}' (allowed: ${allowed.join(', ')})`);
  }
  return match;
}
