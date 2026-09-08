import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

await fs.cp(
  path.join(root, '.next', 'static'),
  path.join(standalone, '.next', 'static'),
  { recursive: true, force: true },
);

await fs.cp(
  path.join(root, 'public'),
  path.join(standalone, 'public'),
  { recursive: true, force: true },
);

process.stdout.write('Copied public and Next.js static assets into the standalone runtime.\n');
