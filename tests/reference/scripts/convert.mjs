// One-time converter: JHora answer key (raw/) → tests/reference/expected/R01.json … R29.json (one per birth in births.json)
// Run from the repo root:  pnpm reference:convert
// Re-run only if raw/ changes. The self-check tests fail if expected/ is out of date.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { convertAll, EXPECTED_DIR } from './parse.mjs';

const all = await convertAll();
mkdirSync(EXPECTED_DIR, { recursive: true });
for (const birth of all) {
  writeFileSync(join(EXPECTED_DIR, `${birth.id}.json`), `${JSON.stringify(birth, null, 2)}\n`);
}
console.log(`Wrote ${all.length} files to ${EXPECTED_DIR}`);
