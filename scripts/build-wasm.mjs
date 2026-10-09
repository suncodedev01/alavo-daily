import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const engineDir = resolve(root, 'packages/engine');
const release = process.argv.includes('--dev') ? '--dev' : '--release';

const result = spawnSync(
  'wasm-pack',
  ['build', 'presentation', '--target', 'web', release, '--out-dir', '../pkg', '--out-name', 'engine'],
  { cwd: engineDir, stdio: 'inherit', shell: true },
);
process.exit(result.status ?? 1);
