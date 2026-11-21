// Day lists per month and year, leap years, and the date checks (D-094 item 3).
import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import { birthDate, daysInMonth, isLeapYear, isUsableDate, usableYear } from './birth-date.ts';
import { checkDate, checkTime } from './form-checks.ts';

describe('daysInMonth (the Day list only offers days that exist)', () => {
  it.each([
    [1, 2025, 31], [3, 2025, 31], [4, 2025, 30], [5, 2025, 31], [6, 2025, 30], [7, 2025, 31],
    [8, 2025, 31], [9, 2025, 30], [10, 2025, 31], [11, 2025, 30], [12, 2025, 31],
  ])('month %i of %i → %i days', (m, y, n) => {
    expect(daysInMonth(m, y)).toBe(n);
  });

  it.each([
    [2024, 29], [2025, 28], [1900, 28], [2000, 29], [1800, 28], [2100, 28], [1996, 29], [1804, 29],
  ])('February %i → %i days', (y, n) => {
    expect(daysInMonth(2, y)).toBe(n);
  });

  it('before the year is typed February offers 29; before the month is chosen, 31', () => {
    expect(daysInMonth(2, null)).toBe(29);
    expect(daysInMonth(null, 2025)).toBe(31);
    expect(daysInMonth(null, null)).toBe(31);
  });

  it('leap years: 1900 is not, 2000 is', () => {
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
  });

  it('agrees with the calendar for every month 1800–2100', () => {
    for (let y = 1800; y <= 2100; y++) {
      for (let m = 1; m <= 12; m++) expect(daysInMonth(m, y)).toBe(new Date(Date.UTC(y, m, 0)).getUTCDate());
    }
  });
});

describe('birthDate / isUsableDate / usableYear', () => {
  it('builds YYYY-MM-DD', () => {
    expect(birthDate('5', '3', '1985')).toBe('1985-03-05');
    expect(birthDate('', '3', '1985')).toBeNull();
  });
  it('real dates in range only', () => {
    expect(isUsableDate('2000-02-29')).toBe(true);
    expect(isUsableDate('1900-02-29')).toBe(false);
    expect(isUsableDate('2025-04-31')).toBe(false);
    expect(isUsableDate('1799-12-31')).toBe(false);
    expect(isUsableDate('2101-01-01')).toBe(false);
  });
  it('usableYear needs 4 digits in 1800–2100', () => {
    expect(usableYear('1943')).toBe(1943);
    expect(usableYear('194')).toBeNull();
    expect(usableYear('1799')).toBeNull();
    expect(usableYear('2101')).toBeNull();
  });
});

const t = { missing: en.missing, errors: en.errors, months: en.form.date.months };

describe('checkDate (live date checks)', () => {
  it('31 April → "April has 30 days.", on the Day field, at once', () => {
    expect(checkDate('31', '4', '2025', t)).toEqual({ message: 'April has 30 days.', parts: ['day'], immediate: true });
    expect(checkDate('31', '4', '', t)!.message).toBe('April has 30 days.'); // even before the year
    expect(checkDate('31', '6', '1990', t)!.message).toBe('June has 30 days.');
  });

  it('February: 29 in a non-leap year, 30 at any time', () => {
    expect(checkDate('29', '2', '1900', t)!.message).toBe('February 1900 has 28 days.');
    expect(checkDate('29', '2', '2023', t)!.message).toBe('February 2023 has 28 days.');
    expect(checkDate('29', '2', '2000', t)).toBeNull();
    expect(checkDate('29', '2', '', t)!.message).toBe(en.missing.date); // year still missing, 29 may be fine
    expect(checkDate('30', '2', '', t)!.message).toBe('February has 29 days.');
  });

  it('year: 4 digits, between 1800 and 2100', () => {
    expect(checkDate('1', '1', '85', t)).toEqual({ message: en.missing.yearDigits, parts: ['year'], immediate: false });
    expect(checkDate('1', '1', '1799', t)).toEqual({ message: en.errors.DATE_OUT_OF_RANGE, parts: ['year'], immediate: true });
    expect(checkDate('1', '1', '2101', t)!.message).toBe(en.errors.DATE_OUT_OF_RANGE);
    expect(checkDate('1', '1', '1800', t)).toBeNull();
    expect(checkDate('31', '12', '2100', t)).toBeNull();
  });

  it('missing parts → the existing message, outlining only the empty ones', () => {
    expect(checkDate('', '', '', t)).toEqual({ message: en.missing.date, parts: ['day', 'month', 'year'], immediate: false });
    expect(checkDate('5', '', '1990', t)).toEqual({ message: en.missing.date, parts: ['month'], immediate: false });
  });

  it('a real date → no message', () => {
    expect(checkDate('15', '8', '1947', t)).toBeNull();
  });
});

describe('checkTime (live time checks)', () => {
  it('missing AM/PM → "Please choose AM or PM."', () => {
    expect(checkTime('7', '30', null, t)).toEqual({ message: 'Please choose AM or PM.', parts: ['period'], immediate: false });
  });
  it('missing hour or minute → the existing message', () => {
    expect(checkTime('', '30', 'am', t)).toEqual({ message: en.missing.time, parts: ['hour'], immediate: false });
    expect(checkTime('', '', null, t)!.parts).toEqual(['hour', 'minute']);
  });
  it('all chosen → no message', () => {
    expect(checkTime('12', '0', 'am', t)).toBeNull();
  });
});
