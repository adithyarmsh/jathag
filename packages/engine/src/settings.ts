// Calculation settings (FR-SET-03, D-008, D-009, D-010).
//
// Each setting is a union of IDs so that later options fit in without changing the shape
// (e.g. node: 'mean' | 'true', ayanamsa: 'lahiri' | 'raman' | 'kp'). In step 0.2.8 only the
// defaults are implemented; anything else throws a clear "not supported yet" error.
// Every chart result echoes the settings it was calculated with.

export type AyanamsaSetting = 'lahiri'; // D-008: Swiss Ephemeris SE_SIDM_LAHIRI ("Traditional Lahiri" in JHora)
export type NodeSetting = 'mean'; // D-009: true node comes later as an advanced setting
export type HouseSystemSetting = 'whole-sign'; // D-010: the only house system in v1

export interface Settings {
  ayanamsa: AyanamsaSetting;
  node: NodeSetting;
  houseSystem: HouseSystemSetting;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  ayanamsa: 'lahiri',
  node: 'mean',
  houseSystem: 'whole-sign',
});

const SUPPORTED: { [K in keyof Settings]: readonly string[] } = {
  ayanamsa: ['lahiri'],
  node: ['mean'],
  houseSystem: ['whole-sign'],
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
  };
}
