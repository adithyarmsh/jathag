const PLAIN = /^[A-Za-z0-9]+( [A-Za-z0-9]+)*$/;

/**
 * Search key for a place name or a query: accents removed, lower case, and every run of
 * characters that is not a letter or digit turned into one space.
 * "Aurangābād" → "aurangabad", "Port-au-Prince" → "port au prince", "  São Paulo " → "sao paulo".
 *
 * Must stay identical to `normalize` in data/places/build-index.mjs (a test checks this).
 */
export function normalize(s: string): string {
  // Fast path (most names): plain ASCII words separated by single spaces.
  if (PLAIN.test(s)) return s.toLowerCase();
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ø/g, 'o')
    .replace(/đ/g, 'd').replace(/ł/g, 'l').replace(/þ/g, 'th').replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
