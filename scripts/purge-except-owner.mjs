/**
 * @deprecated Use `npm run reset-except -- --confirm` instead.
 * Thin wrapper kept so older docs/commands still work.
 */
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts', 'reset-except.mjs');
const extra = process.argv.slice(2);
const args = [script, ...(extra.includes('--confirm') || extra.includes('--dry-run') ? extra : ['--confirm', ...extra])];
const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: root });
process.exit(result.status ?? 1);
