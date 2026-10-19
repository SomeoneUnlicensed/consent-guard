import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'dist', 'static'), { recursive: true });
copyFileSync(join(root, 'static', 'guard.js'), join(root, 'dist', 'static', 'guard.js'));
console.log('static/guard.js copied to dist/static/');
