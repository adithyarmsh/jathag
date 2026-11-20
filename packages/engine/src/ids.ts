// Stable IDs (D-063, FR-LANG-01). The engine never outputs English names.
//
//   Signs        1–12  (1 = Aries … 12 = Pisces)
//   Nakshatras   1–27  (1 = Ashwini … 27 = Revati)
//   Houses       1–12  (1 = the Lagna's sign, whole sign)
//   Bodies       La (Lagna), Su Mo Ma Me Ju Ve Sa Ra Ke
//   Dignity      EX exalted · MT moolatrikona · OS own sign · FR friend's sign · NE neutral sign ·
//                EN enemy's sign · DB debilitated  (null for Rahu/Ketu, D-076)
//
// Same IDs as tests/reference/scripts/ids.mjs.

export const GRAHAS = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'] as const;
export type GrahaCode = (typeof GRAHAS)[number];

export const BODIES = ['La', ...GRAHAS] as const;
export type BodyCode = (typeof BODIES)[number];

/** The seven planets that have dignity and (except the Sun) can be combust. */
export const SEVEN_PLANETS = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa'] as const;
export type PlanetCode = (typeof SEVEN_PLANETS)[number];

export type Sign = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const DIGNITIES = ['EX', 'MT', 'OS', 'FR', 'NE', 'EN', 'DB'] as const;
export type DignityCode = (typeof DIGNITIES)[number];

/** Traditional sign lords (FR-CALC-06), index = sign − 1. */
export const SIGN_LORD: readonly PlanetCode[] = [
  'Ma', // 1 Aries
  'Ve', // 2 Taurus
  'Me', // 3 Gemini
  'Mo', // 4 Cancer
  'Su', // 5 Leo
  'Me', // 6 Virgo
  'Ve', // 7 Libra
  'Ma', // 8 Scorpio
  'Ju', // 9 Sagittarius
  'Sa', // 10 Capricorn
  'Sa', // 11 Aquarius
  'Ju', // 12 Pisces
];

/** Vimshottari order from Ashwini; nakshatra n is ruled by NAKSHATRA_LORD_CYCLE[(n − 1) % 9]. */
export const NAKSHATRA_LORD_CYCLE: readonly GrahaCode[] = ['Ke', 'Ve', 'Su', 'Mo', 'Ma', 'Ra', 'Ju', 'Sa', 'Me'];

export const signLord = (sign: number): PlanetCode => SIGN_LORD[sign - 1];
