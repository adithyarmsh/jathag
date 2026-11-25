// The ephemeris adapter interface (D-069).
//
// All astronomy comes from Swiss Ephemeris through ONE adapter. The rest of the engine only sees
// this interface, so a different binding (e.g. WebAssembly for the phone, v1.3) can be plugged in
// without touching anything else. The JHora reference tests must pass with every adapter.
//
// Every method is synchronous on purpose: Swiss Ephemeris keeps its settings process-wide, so an
// adapter sets them immediately before each calculation and nothing may `await` in between.

import type { GrahaCode } from '../ids.ts';

/** The bodies the adapter calculates directly. Ketu is derived from Rahu by the engine. */
export type EphemerisBody = Exclude<GrahaCode, 'Ke'>;

export interface EphemerisInfo {
  /** Which binding is plugged in, e.g. "sweph 2.10.3-8". */
  binding: string;
  /** Swiss Ephemeris C library version, e.g. "2.10.03". */
  swissEphemerisVersion: string;
  /** Data files the results come from. */
  dataFiles: string[];
}

export interface EphemerisAdapter {
  readonly info: EphemerisInfo;

  /**
   * Julian day number (UT) for a UTC calendar instant (Gregorian calendar).
   * The UTC clock time is used as UT directly, without a leap-second/UT1 correction, the same
   * way JHora does (difference < 0.9 s; checked on R01 in step 0.2.8).
   */
  julianDayUt(year: number, month: number, day: number, hours: number): number;

  /** Sidereal (Lahiri) apparent geocentric longitude in degrees [0, 360) and speed in degrees/day. */
  siderealBody(jdUt: number, body: EphemerisBody): { lon: number; speed: number };

  /** Lahiri ayanamsa in degrees, WITHOUT nutation (used for the Lagna, D-073). */
  ayanamsaWithoutNutation(jdUt: number): number;

  /** Tropical ascendant in degrees (apparent, true obliquity). */
  tropicalAscendant(jdUt: number, lat: number, lng: number): number;

  /**
   * The next sunrise or sunset from `jdUt` on (Julian day, UT), for an observer at `lat`/`lng`. An event
   * exactly at `jdUt` may be returned itself, so to find the one after an event, search from a little later.
   * Upper limb of the Sun, with refraction, altitude 0 m, 1013.25 hPa, 20 °C (D-070 to D-072; JHora's
   * "tip of the Sun's disk appears on the eastern horizon"). Returns null when the Sun does not rise or
   * set there around that time (polar day or night); never throws for that.
   */
  nextSunEvent(jdUt: number, lat: number, lng: number, kind: SunEvent): number | null;
}

export type SunEvent = 'rise' | 'set';

/** Thrown when the ephemeris cannot give a full-precision Swiss Ephemeris answer. */
export class EphemerisError extends Error {
  readonly code: 'EPHEMERIS_FALLBACK' | 'EPHEMERIS_FAILED';
  constructor(code: EphemerisError['code'], message: string) {
    super(message);
    this.name = 'EphemerisError';
    this.code = code;
  }
}
