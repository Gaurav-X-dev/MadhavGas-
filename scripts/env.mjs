import fs from 'node:fs';
import path from 'node:path';

export function loadLocalEnv() {
  for (const file of ['.env.local', '.env']) {
    const target = path.join(process.cwd(), file);
    if (!fs.existsSync(target)) continue;
    for (const rawLine of fs.readFileSync(target, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separator = line.indexOf('=');
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

