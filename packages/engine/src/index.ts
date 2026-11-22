// @jathag/engine: calculations only. No UI, no interpretation text (CLAUDE.md rule 3).
// See packages/engine/README.md.

export { calculateChart, ChartInputError } from './chart.ts';
export type { Chart, ChartInput, BodyResult, HouseResult } from './chart.ts';
export { localToUtc, TimeError, tzdataVersion } from './time.ts';
export type { LocalBirthTime, BirthZone, UtcResult, TimeErrorCode } from './time.ts';
export { DEFAULT_SETTINGS, resolveSettings, SettingsError } from './settings.ts';
export type { Settings, DashaYearSetting } from './settings.ts';
export { DASHA_YEAR_DAYS } from './settings.ts';
export { vimshottariTimeline, vimshottariForChart, vimshottariNow, VIMSHOTTARI_YEARS, VIMSHOTTARI_ORDER, DashaInputError } from './dasha.ts';
export type { VimshottariTimeline, Mahadasha, Antardasha, DashaPeriod, DashaNow, DashaRef, DashaLevels } from './dasha.ts';
export {
  transitsForChart,
  calculateSadeSati,
  crossingTimeline,
  rawCrossings,
  sadeSatiPeriods,
  TransitInputError,
  STEP_DAYS,
  MAX_SPEED,
  SADE_SATI_JOIN_GAP_YEARS,
  SADE_SATI_SPAN_YEARS,
  SIGN_CHANGE_YEARS_AHEAD,
  EPHEMERIS_DATA_START,
  EPHEMERIS_DATA_END,
} from './transits.ts';
export type {
  Transits,
  TransitPosition,
  SignCrossing,
  SignChangePlanet,
  SearchBody,
  CrossingKind,
  CrossingTimeline,
  SadeSati,
  SadeSatiPeriod,
  SadeSatiPhase,
  SadeSatiCrossing,
  SadeSatiRef,
  SadeSatiStatus,
  PhaseDates,
} from './transits.ts';
export { ENGINE_VERSION } from './version.ts';
export * from './ids.ts';
export { placement, angularDistance, houseOf, nthSignFrom } from './zodiac.ts';
export type { ZodiacPlacement } from './zodiac.ts';
export { dignity, EXALTATION, DEBILITATION_SIGN, MOOLATRIKONA, NATURAL_RELATIONSHIP } from './dignity.ts';
export { aspects, ASPECT_DISTANCES } from './aspects.ts';
export type { AspectResult } from './aspects.ts';
export { isCombust, COMBUSTION_ORB } from './combustion.ts';
export { createSwephAdapter, defaultEphePath, DATA_FILES } from './ephemeris/sweph.ts';
export { EphemerisError } from './ephemeris/types.ts';
export type { EphemerisAdapter, EphemerisInfo } from './ephemeris/types.ts';
