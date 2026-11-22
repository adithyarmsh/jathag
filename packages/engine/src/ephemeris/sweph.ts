// Swiss Ephemeris adapter for the server, using the `sweph` Node binding (D-069).
//
// THIS IS THE ONLY FILE IN THE ENGINE THAT MAY IMPORT `sweph` (checked by a test).
//
// Rules this file enforces (D-069, D-071, D-073):
//   - The data files (sepl_18.se1, semo_18.se1, 1800–2399) come from packages/engine/ephe/.
//   - The sidereal mode (SE_SIDM_LAHIRI) is set immediately before every calculation, because
//     Swiss Ephemeris settings are process-wide and another caller could have changed them.
//   - Every returned flag is checked. If Swiss Ephemeris fell back to its Moshier model (data
//     files missing), we throw. Fallback results are never returned.

import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sweph from 'sweph';
import type { EphemerisAdapter, EphemerisBody, EphemerisInfo } from './types.ts';
import { EphemerisError } from './types.ts';

const C = sweph.constants;

/**
 * Folder holding the committed Swiss Ephemeris data files (packages/engine/ephe/), found from this
 * file's own location. Only used when no `ephePath` is passed. Worked out on first use, never when the
 * module loads, and without `new URL(…, import.meta.url)`: bundlers (Turbopack) treat that pattern as a
 * file to bundle. A bundled copy of the engine (the web app) must pass `ephePath`; if it does not, this
 * path does not exist there, Swiss Ephemeris finds no files and the adapter throws EPHEMERIS_FALLBACK
 * (never a silent Moshier answer). (Step 0.3.1, D-096 item 7; replaces the 0.2.12 build loader.)
 */
export function defaultEphePath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'ephe') + sep;
}
export const DATA_FILES = ['sepl_18.se1', 'semo_18.se1'];

const SWEPH_BINDING_VERSION = '2.10.3-8';

const SE_BODY: Record<EphemerisBody, number> = {
  Su: C.SE_SUN,
  Mo: C.SE_MOON,
  Ma: C.SE_MARS,
  Me: C.SE_MERCURY,
  Ju: C.SE_JUPITER,
  Ve: C.SE_VENUS,
  Sa: C.SE_SATURN,
  Ra: C.SE_MEAN_NODE, // mean node (D-009); true node is a later setting
};

const EPHEMERIS_BITS = C.SEFLG_JPLEPH | C.SEFLG_SWIEPH | C.SEFLG_MOSEPH;

// The data path is also process-wide. Re-setting it closes and reopens the files, so we only
// set it when it differs from what was last set in this process.
let activeEphePath: string | null = null;

function check(what: string, flag: number, error: string): void {
  if (flag < 0) {
    throw new EphemerisError('EPHEMERIS_FAILED', `Swiss Ephemeris failed (${what}): ${error}`);
  }
  if ((flag & EPHEMERIS_BITS) !== C.SEFLG_SWIEPH) {
    throw new EphemerisError(
      'EPHEMERIS_FALLBACK',
      `Swiss Ephemeris did not use its data files for ${what} (it fell back to another model). ` +
        `Check that ${DATA_FILES.join(' and ')} are in the ephemeris folder. Details: ${error || 'none'}`,
    );
  }
}

export function createSwephAdapter(options: { ephePath?: string } = {}): EphemerisAdapter {
  const ephePath = options.ephePath ?? defaultEphePath();

  const prepare = () => {
    if (activeEphePath !== ephePath) {
      sweph.set_ephe_path(ephePath);
      activeEphePath = ephePath;
    }
    sweph.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);
  };

  const info: EphemerisInfo = {
    binding: `sweph ${SWEPH_BINDING_VERSION}`,
    swissEphemerisVersion: sweph.version(),
    dataFiles: [...DATA_FILES],
  };

  return {
    info,

    julianDayUt(year, month, day, hours) {
      return sweph.julday(year, month, day, hours, C.SE_GREG_CAL);
    },

    siderealBody(jdUt, body) {
      prepare();
      const r = sweph.calc_ut(jdUt, SE_BODY[body], C.SEFLG_SWIEPH | C.SEFLG_SPEED | C.SEFLG_SIDEREAL);
      check(`body ${body}`, r.flag, r.error);
      return { lon: r.data[0], speed: r.data[3] };
    },

    ayanamsaWithoutNutation(jdUt) {
      prepare();
      const r = sweph.get_ayanamsa_ex_ut(jdUt, C.SEFLG_SWIEPH | C.SEFLG_NONUT);
      check('ayanamsa', r.flag, r.error);
      return r.data;
    },

    tropicalAscendant(jdUt, lat, lng) {
      prepare();
      // Whole sign ('W'); the ascendant itself does not depend on the house system.
      const r = sweph.houses_ex2(jdUt, 0, lat, lng, 'W');
      if (r.flag < 0) {
        throw new EphemerisError('EPHEMERIS_FAILED', `Swiss Ephemeris failed (ascendant): ${r.error}`);
      }
      return r.data.points[0];
    },
  };
}
