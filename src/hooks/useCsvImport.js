import { useCallback, useState } from 'react';
import {
  assertExactHeaders,
  buildFailuresCsv,
  buildTemplateCsv,
  downloadTextFile,
  parseCsv,
} from '../lib/csvImport';

/**
 * Shared CSV import runner.
 *
 * @param {object} options
 * @param {string[]} options.headers - Exact expected column headers (template order)
 * @param {Record<string,string>} options.exampleRow - Sample values for template
 * @param {string} options.templateFilename
 * @param {(rowValues: Record<string,string>, helpers: { rowNumber: number }) => object | Promise<object>} options.mapRow
 *   Validate + map a CSV row to insert values. Throw Error with a clear message on failure.
 * @param {(mapped: object) => Promise<void>} options.importRow - Persist one mapped row
 */
export function useCsvImport({
  headers,
  exampleRow,
  templateFilename = 'template.csv',
  mapRow,
  importRow,
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [fileError, setFileError] = useState('');

  const reset = useCallback(() => {
    setBusy(false);
    setResult(null);
    setFileError('');
  }, []);

  const downloadTemplate = useCallback(() => {
    const csv = buildTemplateCsv(headers, exampleRow);
    downloadTextFile(templateFilename, csv);
  }, [headers, exampleRow, templateFilename]);

  const downloadFailures = useCallback(() => {
    if (!result?.failed?.length) return;
    const csv = buildFailuresCsv(result.failed, headers);
    downloadTextFile('import-failures.csv', csv);
  }, [result, headers]);

  const runFile = useCallback(async (file) => {
    setFileError('');
    setResult(null);
    if (!file) {
      setFileError('Choose a CSV file to upload.');
      return null;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const { headers: actualHeaders, rows } = parseCsv(text);
      assertExactHeaders(actualHeaders, headers);

      const imported = [];
      const failed = [];

      for (const row of rows) {
        try {
          const mapped = await mapRow(row.values, { rowNumber: row.rowNumber });
          await importRow(mapped);
          imported.push({ rowNumber: row.rowNumber, values: row.values });
        } catch (err) {
          failed.push({
            rowNumber: row.rowNumber,
            values: row.values,
            reason: err?.message || String(err),
          });
        }
      }

      const summary = {
        importedCount: imported.length,
        failedCount: failed.length,
        imported,
        failed,
      };
      setResult(summary);
      return summary;
    } catch (err) {
      setFileError(err?.message || String(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, [headers, mapRow, importRow]);

  return {
    busy,
    result,
    fileError,
    reset,
    runFile,
    downloadTemplate,
    downloadFailures,
  };
}
