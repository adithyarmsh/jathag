// The birth chart (D-1): positions, Lagna, whole-sign houses, D-9, dignity, aspects, combustion.
//
// Pure TypeScript: all astronomy comes from the ephemeris adapter (D-025, D-069).
// The calculation is synchronous from start to finish, so Swiss Ephemeris' process-wide settings
// can't be changed by anyone else half-way through.

import { aspects, type AspectResult } from './aspects.ts';
import { isCombust } from './combustion.ts';
import { dignity } from './dignity.ts';
import { createSwephAdapter } from './ephemeris/sweph.ts';
import type { EphemerisAdapter, EphemerisInfo } from './ephemeris/types.ts';
import { BODIES, GRAHAS, signLord, type BodyCode, type DignityCode, type GrahaCode, type PlanetCode, type Sign } from './ids.ts';
import { resolveSettings, type Settings } from './settings.ts';
import { utcParts } from './time.ts';
import { houseOf, normalizeDegrees, placement, type ZodiacPlacement } from './zodiac.ts';
import { ENGINE_VERSION } from './version.ts';

export interface ChartInput {
  /** Birth instant in UTC, ISO 8601 (use localToUtc() to get it from a local time). */
  utc: string;
  /** Latitude in degrees, north positive. */
  lat: number;
  /** Longitude in degrees, east positive. */
  lng: number;
}

export interface BodyResult extends ZodiacPlacement {
  /** Speed in degrees/day (null for the Lagna). */
  speed: number | null;
  /** Speed < 0 (null for the Lagna). The mean node is always retrograde; how to show it is a UI decision. */
  retrograde: boolean | null;
  /** Whole-sign house, 1–12. */
  house: number;
  /** D-076; null for Lagna, Rahu and Ketu. */
  dignity: DignityCode | null;
  /** D-077; null for the Lagna. */
  combust: boolean | null;
}

export interface HouseResult {
  house: number;
  sign: Sign;
  lord: PlanetCode;
  /** Grahas in this house, in Su Mo Ma Me Ju Ve Sa Ra Ke order. */
  occupants: GrahaCode[];
}

export interface Chart {
  meta: {
    engineVersion: string;
    settings: Settings;
    ephemeris: EphemerisInfo;
    input: ChartInput;
    julianDayUt: number;
  };
  bodies: Record<BodyCode, BodyResult>;
  houses: HouseResult[];
  aspects: Record<GrahaCode, AspectResult>;
}

export class ChartInputError extends Error {
  readonly code = 'INVALID_LOCATION';
  constructor(message: string) {
    super(message);
    this.name = 'ChartInputError';
  }
}

let defaultAdapter: EphemerisAdapter | null = null;

export function calculateChart(
  input: ChartInput,
  options: { settings?: Partial<Record<keyof Settings, unknown>>; ephemeris?: EphemerisAdapter } = {},
): Chart {
  const settings = resolveSettings(options.settings);
  const eph = options.ephemeris ?? (defaultAdapter ??= createSwephAdapter());
  const { lat, lng } = input;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new ChartInputError(`Latitude must be between −90 and 90, got ${lat}.`);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new ChartInputError(`Longitude must be between −180 and 180, got ${lng}.`);

  const t = utcParts(input.utc);
  const jd = eph.julianDayUt(t.year, t.month, t.day, t.hours);

  // Planets: sidereal, apparent, with nutation (D-071). Ketu = Rahu + 180°, same speed.
  const raw = {} as Record<GrahaCode, { lon: number; speed: number }>;
  for (const g of GRAHAS) {
    if (g === 'Ke') continue;
    raw[g] = eph.siderealBody(jd, g);
  }
  raw.Ke = { lon: normalizeDegrees(raw.Ra.lon + 180), speed: raw.Ra.speed };

  // Lagna (D-073): tropical ascendant minus the Lahiri ayanamsa WITHOUT nutation.
  const lagnaLon = normalizeDegrees(eph.tropicalAscendant(jd, lat, lng) - eph.ayanamsaWithoutNutation(jd));
  const lagna = placement(lagnaLon);

  const bodies = {} as Record<BodyCode, BodyResult>;
  for (const code of BODIES) {
    if (code === 'La') {
      bodies.La = { ...lagna, speed: null, retrograde: null, house: 1, dignity: null, combust: null };
      continue;
    }
    const { lon, speed } = raw[code];
    const p = placement(lon);
    const retrograde = speed < 0;
    bodies[code] = {
      ...p,
      speed,
      retrograde,
      house: houseOf(p.sign, lagna.sign),
      dignity: dignity(code, lon),
      combust: isCombust(code, lon, retrograde, raw.Su.lon),
    };
  }

  const houses: HouseResult[] = [];
  for (let h = 1; h <= 12; h++) {
    const sign = ((((lagna.sign - 1 + h - 1) % 12) + 1) as Sign);
    houses.push({ house: h, sign, lord: signLord(sign), occupants: GRAHAS.filter((g) => bodies[g].sign === sign) });
  }

  const signs = Object.fromEntries(GRAHAS.map((g) => [g, bodies[g].sign])) as Record<GrahaCode, Sign>;

  return {
    meta: {
      engineVersion: ENGINE_VERSION,
      settings,
      ephemeris: eph.info,
      input: { utc: input.utc, lat, lng },
      julianDayUt: jd,
    },
    bodies,
    houses,
    aspects: aspects(signs, lagna.sign),
  };
}
