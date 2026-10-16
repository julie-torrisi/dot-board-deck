#!/usr/bin/env node
// Runs the TypeScript deck check with the engine's own layout code.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
try {
  execFileSync(join(root, 'node_modules/.bin/vite-node'), [join(root, 'scripts/check.ts'), ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' });
} catch { process.exit(1); }
