// Footer version (D-094 item 8).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import { STEP, versionLabel } from './version.ts';

describe('footer version', () => {
  it('"v<step> · <short commit>" on Vercel', () => {
    expect(versionLabel('0.2.15', '7e5a8dc0123456789abcdef', en.footer)).toBe('v0.2.15 · 7e5a8dc');
  });
  it('only the step locally (no commit)', () => {
    expect(versionLabel('0.2.15', undefined, en.footer)).toBe('v0.2.15');
    expect(versionLabel('0.2.15', '', en.footer)).toBe('v0.2.15');
  });
  it('STEP is a roadmap step ID that exists in docs/roadmap.md', () => {
    expect(STEP).toMatch(/^\d+\.\d+\.\d+(\.\d+)?$/); // e.g. 0.3.2 or an inserted step like 0.3.2.1
    const roadmap = readFileSync(join(import.meta.dirname, '../../../docs/roadmap.md'), 'utf8');
    expect(roadmap).toContain(`| ${STEP} |`);
  });
});
