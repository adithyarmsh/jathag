// Calculation settings (FR-SET-03, D-008, D-009, D-010).
//
// Each setting is a union of IDs so that later options fit in without changing the shape
// (e.g. node: 'mean' | 'true', ayanamsa: 'lahiri' | 'raman' | 'kp'). In step 0.2.8 only the
// defaults are implemented; anything else throws a clear "not supported yet" error.
// Step 0.3.1 adds dashaYear, with all three FR-SET-02 values supported.
// Every chart result echoes the settings it was calculated with.

export type AyanamsaSetting = 'lahiri'; // D-008: Swiss Ephemeris SE_SIDM_LAHIRI ("Traditional Lahiri" in JHora)
export type NodeSetting = 'mean'; // D-009: true node comes later as an advanced setting
export type HouseSystemSetting = 'whole-sign'; // D-010: the only house system in v1
/**
 * Vimshottari dasha year length in days (D-011, D-096 item 6, FR-SET-02). The ID is the number of
 * days written as a string, so it is an exact choice from a list (like the other settings), never a
 * free number. Only '365.25' (the default) is checked against JHora.
 */
export type DashaYearSetting = '365.25' | '360' | '365.2422';

/** Days in one dasha year for each DashaYearSetting. */
export const DASHA_YEAR_DAYS: Readonly<Record<DashaYearSetting, number>> = Object.freeze({
  '365.25': 365.25,
  '360': 360,
  '365.2422': 365.2422,
});

export interface Settings {
  ayanamsa: AyanamsaSetting;
  node: NodeSetting;
  houseSystem: HouseSystemSetting;
  dashaYear: DashaYearSetting;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  ayanamsa: 'lahiri',
  node: 'mean',
  houseSystem: 'whole-sign',
  dashaYear: '365.25',
});

const SUPPORTED: { [K in keyof Settings]: readonly string[] } = {
  ayanamsa: ['lahiri'],
  node: ['mean'],
  houseSystem: ['whole-sign'],
  dashaYear: ['365.25', '360', '365.2422'],
};

export class SettingsError extends Error {
  readonly code: 'SETTING_NOT_SUPPORTED' | 'UNKNOWN_SETTING';
  readonly setting: string;
  constructor(code: SettingsError['code'], setting: string, message: string) {
    super(message);
    this.name = 'SettingsError';
    this.code = code;
    this.setting = setting;
  }
}

/** Fill in defaults and reject anything the engine cannot calculate yet. */
export function resolveSettings(partial: Partial<Record<keyof Settings, unknown>> = {}): Settings {
  for (const [key, value] of Object.entries(partial)) {
    if (!(key in SUPPORTED)) {
      throw new SettingsError('UNKNOWN_SETTING', key, `Unknown setting "${key}".`);
    }
    if (value !== undefined && !SUPPORTED[key as keyof Settings].includes(value as string)) {
      throw new SettingsError(
        'SETTING_NOT_SUPPORTED',
        key,
        `Setting ${key} = ${JSON.stringify(value)} is not supported yet. ` +
          `Supported: ${SUPPORTED[key as keyof Settings].join(', ')}.`,
      );
    }
  }
  // Fixed key order so the JSON output is byte-identical (NFR-DET-01).
  return {
    ayanamsa: (partial.ayanamsa as AyanamsaSetting | undefined) ?? DEFAULT_SETTINGS.ayanamsa,
    node: (partial.node as NodeSetting | undefined) ?? DEFAULT_SETTINGS.node,
    houseSystem: (partial.houseSystem as HouseSystemSetting | undefined) ?? DEFAULT_SETTINGS.houseSystem,
    dashaYear: (partial.dashaYear as DashaYearSetting | undefined) ?? DEFAULT_SETTINGS.dashaYear,
  };
}
