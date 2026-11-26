// Every error code the API can return has a friendly message (FR-IN-08). The list of codes is read
// from packages/api/src/errors.ts itself, so a new code there fails this test until it has words.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import { ERROR_FIELD, errorFor, networkError } from './api-errors.ts';

const source = readFileSync(join(import.meta.dirname, '../../../packages/api/src/errors.ts'), 'utf8')
  .replace(/\/\/.*$/gm, ''); // drop comments (they contain ';')
const typeBlock = source.slice(source.indexOf('export type ApiErrorCode'), source.indexOf(';', source.indexOf('export type ApiErrorCode')));
const CODES = [...typeBlock.matchAll(/\|\s*'([A-Z_]+)'/g)].map((m) => m[1]!);

describe('error messages', () => {
  it('finds the 17 codes in errors.ts', () => {
    expect(CODES).toHaveLength(17);
    expect(CODES).toContain('AMBIGUOUS_LOCAL_TIME');
  });
  it.each(CODES)('%s has a message and a field', (code) => {
    const msg = (en.errors as Record<string, string>)[code];
    expect(msg, `en.json errors.${code}`).toBeTruthy();
    expect(msg).not.toMatch(/[A-Z]{3,}_[A-Z]/); // never shows a raw code
    expect(ERROR_FIELD[code as keyof typeof ERROR_FIELD]).toBeTruthy();
    expect(errorFor(code, en.errors).message).toBe(msg);
  });
  it('no message for a code that does not exist', () => {
    const extra = Object.keys(en.errors).filter((k) => !CODES.includes(k) && !['network', 'unknown', 'search'].includes(k));
    expect(extra).toEqual([]);
  });
  it('messages go next to the right field', () => {
    expect(errorFor('DATE_OUT_OF_RANGE', en.errors)).toEqual({ field: 'date', code: 'DATE_OUT_OF_RANGE', message: 'Please enter a date between 1 January 1800 and 31 December 2100.' });
    expect(errorFor('INVALID_DATE', en.errors).field).toBe('date');
    expect(errorFor('NONEXISTENT_LOCAL_TIME', en.errors)).toMatchObject({ field: 'time', message: "This time didn't exist on that day in that place: the clocks jumped forward. Please check the time." });
    expect(errorFor('AMBIGUOUS_LOCAL_TIME', en.errors).field).toBe('time');
    expect(errorFor('MISSING_PLACE', en.errors).field).toBe('place');
    expect(errorFor('INTERNAL_ERROR', en.errors).field).toBe('form');
  });
  it('unknown codes, no code, and network failures get a calm generic message', () => {
    expect(errorFor('SOMETHING_NEW', en.errors)).toEqual({ field: 'form', code: 'unknown', message: en.errors.unknown });
    expect(errorFor(undefined, en.errors).code).toBe('unknown');
    expect(networkError(en.errors)).toEqual({ field: 'form', code: 'network', message: en.errors.network });
  });
  it('the "first/second time" choice has its words', () => {
    expect(en.form.repeatedTime).toEqual({
      question: 'This time happened twice that night: the clocks went back an hour. Which one was it?',
      earlier: 'The first time',
      later: 'The second time (after the clocks went back)',
      summaryEarlier: 'the first time',
      summaryLater: 'the second time',
    });
  });
});

describe('fixed wording from the handoff (D-092, D-093)', () => {
  it('form title, Beta notice and page description (D-093; Beta band text from the design spec §4, step 0.4.5)', () => {
    expect(en.form.title).toBe('Generate Your Chart');
    expect(en.form.subtitle).toBe('Date, time and place of birth.');
    expect(en.betaBand).toBe('Jathag Beta. The stars are still aligning: we are actively refining our features and design.');
    expect(en.meta.description.endsWith('Beta, stars are being aligned.')).toBe(true);
  });
  it('privacy line', () => {
    expect(en.form.privacy).toBe('Your details are only used to calculate your chart. Nothing is stored on our servers.');
  });
  it('the single-situation notes', () => {
    expect(en.clockNote.mumbai).toBe("In Mumbai until the 1950s, many people used Bombay time, 39 minutes behind IST. We've calculated your chart with IST. If your family used Bombay time, your chart may be different. You'll be able to switch soon.");
    expect(en.clockNote.westBengal).toBe("In Kolkata and West Bengal until the late 1940s, many people used Calcutta time, 23 minutes 20 seconds ahead of IST. We've calculated your chart with IST. If your family used Calcutta time, your chart may be different. You'll be able to switch soon.");
    expect(en.clockNote.warTime).toBe("From September 1942 to October 1945 India's official clock was War Time, one hour ahead of IST, and we've used it. If the time was written in IST, your chart may be different. You'll be able to switch soon.");
    expect(en.clockNote.warTimeEarly).toBe("Between October 1941 and May 1942 some parts of India used War Time, one hour ahead of IST. We've calculated your chart with IST. If the time was written in War Time, your chart may be different. You'll be able to switch soon.");
    expect(en.clockNote.before1906).toBe("Before 1906, many towns kept their own local time. Here that was about {minutes} minutes {direction} IST. We've calculated your chart with IST. If the time was written in local time, your chart may be different. You'll be able to switch soon.");
  });
});
