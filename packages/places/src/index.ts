/**
 * @jathag/places — birth-place search over the GeoNames place index (steps 0.2.11, D-087).
 *
 * Pure TypeScript, no UI, no file access (see `./node.ts` for loading the index file in Node).
 * Nothing here logs or stores queries: a birthplace is birth data (FR-API-02).
 *
 * Index format 2 (see data/places/README.md): the place rows plus the search names, already
 * normalised and sorted at build time. Loading only finds where each row starts and splits the
 * search-name lines; a place row is parsed only when it is shown. That keeps the cold start on
 * Vercel's single CPU at about a second.
 */
import { normalize } from './normalize.ts';

export { normalize };

export interface Place {
  /** GeoNames id (stable; use it to refer to a chosen place). */
  id: number;
  /** Name as GeoNames writes it (may contain accents, e.g. "Aurangābād"). */
  name: string;
  /** Plain-ASCII name ("Aurangabad"). */
  asciiName: string;
  /**
   * "Place, District, State, Country" in plain ASCII, repeats collapsed, the words "District" and
   * "Division" dropped; parts GeoNames does not have are left out (FR-IN-04, D-087).
   */
  label: string;
  /** Decimal degrees, north positive. Full GeoNames precision. */
  lat: number;
  /** Decimal degrees, east positive. Full GeoNames precision. */
  lng: number;
  /** IANA time zone, e.g. "Asia/Kolkata". */
  timeZone: string;
  /** ISO 3166 alpha-2 code, e.g. "IN". */
  countryCode: string;
  country: string;
  /** GeoNames admin1 (state) code, e.g. "16" (Maharashtra) or "28" (West Bengal); "" if none. */
  admin1Code: string;
  admin1: string;
  /** GeoNames admin2 (district) code, e.g. "518" (Mumbai Suburban); "" if none. */
  admin2Code: string;
  admin2: string;
  /** 0 when GeoNames has no figure (most villages). */
  population: number;
  /** GeoNames feature code: PPL, PPLA, PPLX, PPLQ … */
  featureCode: string;
}

export interface SearchResult extends Place {
  /** The name that matched, when it was an alternate/old name (e.g. "Bombay" for Mumbai). */
  matchedName?: string;
}

export interface SearchOptions {
  /** Maximum number of results (default 10). */
  limit?: number;
  /** GeoNames feature codes to leave out, e.g. ['PPLQ']. Default: none (D-087 keeps all). */
  excludeFeatureCodes?: readonly string[];
}

/** Queries shorter than this (after normalising) return no results (D-087). */
export const MIN_QUERY_LENGTH = 3;

/** GeoNames codes used by the "Which clock?" rule (D-082, D-086, D-087). */
export const WEST_BENGAL_ADMIN1 = '28';
export const MAHARASHTRA_ADMIN1 = '16';
export const MUMBAI_CITY_ADMIN2 = '519';
export const MUMBAI_SUBURBAN_ADMIN2 = '518';

/** True for places in West Bengal (GeoNames state IN.28). */
export function isWestBengal(p: Pick<Place, 'countryCode' | 'admin1Code'>): boolean {
  return p.countryCode === 'IN' && p.admin1Code === WEST_BENGAL_ADMIN1;
}

interface Cand {
  p: number;
  pop: number;
  exact: boolean;
  kind: number;
  /** Order bucket from the build (D-088): 0–2 India, 3–5 elsewhere; city / village / abandoned. */
  group: number;
}

export class PlaceIndex {
  /** Number of places. */
  readonly size: number;
  /** SHA-256 of each GeoNames source file, from the index header. */
  readonly sources: ReadonlyArray<{ name: string; sha256: string }>;
  /** GeoNames ids of Mumbai places that have no district in GeoNames (mumbai-no-district.json). */
  readonly mumbaiExtraIds: ReadonlySet<number>;
  /** Corrections applied to GeoNames values by the build (corrections.json): "id field old new". */
  readonly corrections: ReadonlyArray<string>;

  private readonly text: string;
  /** Start of each place row in `text`. */
  private readonly rowStart: Int32Array;
  /** Sorted search-name lines: "key\tplace(36)\tkind(36)\tpopulation(36)\tgroup". */
  private readonly keys: string[];
  private readonly zones: string[] = [];
  private readonly countries = new Map<string, string>();
  private readonly admin1 = new Map<string, string>();
  private readonly admin2 = new Map<string, string>();

  /** Parses the text of places.tsv, format 2 (see data/places/README.md). */
  constructor(text: string) {
    if (!text.startsWith('JATHAG-PLACES\t2\n')) throw new Error('Not a Jathag place index (format 2)');
    this.text = text;
    const sources: { name: string; sha256: string }[] = [];
    const mumbai = new Set<number>();
    const corrections: string[] = [];
    // Header lines start with '#'.
    let pos = text.indexOf('\n') + 1;
    while (text.charCodeAt(pos) === 35) {
      const end = text.indexOf('\n', pos);
      const f = text.slice(pos, end).split('\t');
      switch (f[0]) {
        case '#S': sources.push({ name: f[1]!, sha256: f[2]! }); break;
        case '#Z': this.zones[Number(f[1])] = f[2]!; break;
        case '#C': this.countries.set(f[1]!, asciiOnly(f[2]!)); break;
        case '#1': this.admin1.set(f[1]!, f[3] || f[2]!); break; // ASCII name
        case '#2': this.admin2.set(f[1]!, f[3] || f[2]!); break;
        case '#M': mumbai.add(Number(f[1])); break;
        case '#X': corrections.push(f.slice(1).join(' ')); break;
      }
      pos = end + 1;
    }
    this.sources = sources;
    this.mumbaiExtraIds = mumbai;
    this.corrections = corrections;
    // Place rows until the "#K" line.
    const kAt = text.indexOf('\n#K\n', pos - 1);
    if (kAt < 0) throw new Error('Place index has no search names (#K)');
    const starts: number[] = [];
    while (pos <= kAt) {
      starts.push(pos);
      pos = text.indexOf('\n', pos) + 1;
    }
    this.rowStart = Int32Array.from(starts);
    this.size = starts.length;
    const keyText = text.slice(kAt + 4);
    this.keys = keyText.split('\n');
    if (this.keys[this.keys.length - 1] === '') this.keys.pop();
  }

  /** Number of search names (names + ASCII names + alternate names). */
  get keyCount(): number {
    return this.keys.length;
  }

  /** The place with this GeoNames id, or undefined. */
  get(id: number): Place | undefined {
    let lo = 0;
    let hi = this.size - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const s = this.rowStart[mid]!;
      const v = Number(this.text.slice(s, this.text.indexOf('\t', s)));
      if (v === id) return this.place(mid);
      if (v < id) lo = mid + 1; else hi = mid - 1;
    }
    return undefined;
  }

  /** Calls fn for every place (for tests and reports). */
  forEach(fn: (p: Place) => void): void {
    for (let i = 0; i < this.size; i++) fn(this.place(i));
  }

  /**
   * True for places in Mumbai for the "Which clock?" rule (D-082, D-086, D-087): district Mumbai
   * City (IN.16.519) or Mumbai Suburban (IN.16.518), or on the list of Mumbai places that have
   * no district in GeoNames.
   */
  isMumbai(p: Pick<Place, 'id' | 'countryCode' | 'admin1Code' | 'admin2Code'>): boolean {
    if (p.countryCode !== 'IN') return false;
    if (p.admin1Code === MAHARASHTRA_ADMIN1
      && (p.admin2Code === MUMBAI_CITY_ADMIN2 || p.admin2Code === MUMBAI_SUBURBAN_ADMIN2)) return true;
    return this.mumbaiExtraIds.has(p.id);
  }

  /**
   * Type-ahead search (FR-IN-04, D-087, D-088). Case- and accent-insensitive prefix match;
   * at least 3 characters. Places in India match on their name, ASCII name and kept old or
   * alternate names; places elsewhere on their name and ASCII name only. Text after a comma
   * narrows the result: "aurangabad, bihar" keeps places whose district, state or country
   * starts with "bihar".
   *
   * Without a comma (D-094 item 1): the whole text is always tried first, so names of several
   * words ("new delhi", "salt lake") are found as before. Only if that finds nothing, the last
   * word(s) are tried as a district/state/country filter instead, starting with the last word
   * and moving left: "london canada" → name "london" + filter "canada"; "salem tamil nadu" →
   * "salem tamil" + "nadu", then "salem" + "tamil nadu". The first try that finds something wins.
   *
   * Order (D-088): places in India first, then the rest of the world; within each, population
   * (largest first). Ties, including places with no population figure: cities, state/district
   * seats and city neighbourhoods (and every place in Mumbai) before villages, villages before
   * abandoned/historical places; then exact match before prefix; then alphabetical by label;
   * then GeoNames id (so the order is always the same).
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const limit = options.limit ?? 10;
    const exclude = options.excludeFeatureCodes?.length ? new Set(options.excludeFeatureCodes) : undefined;
    const [head = '', ...rest] = query.split(',');
    const q = normalize(head);
    if (q.length < MIN_QUERY_LENGTH || limit <= 0) return [];
    const filters = rest.map(normalize).filter((s) => s.length > 0);
    const first = this.searchOnce(q, filters, limit, exclude);
    if (first.length > 0 || rest.length > 0) return first;

    // Nothing found and no comma: try the last word(s) as a filter (D-094 item 1).
    const words = q.split(' ');
    for (let k = 1; k < words.length; k++) {
      const name = words.slice(0, words.length - k).join(' ');
      if (name.length < MIN_QUERY_LENGTH) break;
      const found = this.searchOnce(name, [words.slice(words.length - k).join(' ')], limit, exclude);
      if (found.length > 0) return found;
    }
    return [];
  }

  /** One search: places whose name starts with q (normalised), narrowed by filters, in D-088 order. */
  private searchOnce(q: string, filters: string[], limit: number, exclude: Set<string> | undefined): SearchResult[] {
    // First line >= q, then walk while the key starts with q.
    const keys = this.keys;
    let lo = 0;
    let hi = keys.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (keys[mid]! < q) lo = mid + 1; else hi = mid;
    }
    const best = new Map<number, Cand>();
    for (let j = lo; j < keys.length; j++) {
      const line = keys[j]!;
      if (!line.startsWith(q)) break;
      const t1 = line.indexOf('\t');
      const t2 = line.indexOf('\t', t1 + 1);
      const t3 = line.indexOf('\t', t2 + 1);
      const t4 = line.indexOf('\t', t3 + 1);
      const p = parseInt(line.slice(t1 + 1, t2), 36);
      const kind = parseInt(line.slice(t2 + 1, t3), 36);
      const exact = t1 === q.length;
      const prev = best.get(p);
      if (prev && (prev.exact && !exact || prev.exact === exact && prev.kind <= kind)) continue;
      best.set(p, { p, pop: parseInt(line.slice(t3 + 1, t4), 36), exact, kind, group: line.charCodeAt(t4 + 1) - 48 });
    }

    let cands = [...best.values()];
    if (exclude || filters.length > 0) {
      cands = cands.filter((c) => {
        const f = this.row(c.p);
        if (exclude?.has(f[10]!)) return false;
        return filters.length === 0 || this.matchesFilters(f, filters);
      });
    }
    const labels = new Map<number, string>();
    const label = (p: number) => {
      let l = labels.get(p);
      if (l === undefined) { l = this.place(p).label; labels.set(p, l); }
      return l;
    };
    cands.sort((x, y) => {
      const ix = x.group < 3 ? 0 : 1;
      const iy = y.group < 3 ? 0 : 1;
      if (ix !== iy) return ix - iy; // India first
      if (x.pop !== y.pop) return y.pop - x.pop;
      if (x.group !== y.group) return x.group - y.group; // city / neighbourhood, village, abandoned
      if (x.exact !== y.exact) return x.exact ? -1 : 1;
      const lx = label(x.p);
      const ly = label(y.p);
      if (lx !== ly) return lx < ly ? -1 : 1;
      return x.p - y.p; // rows are in GeoNames id order
    });

    return cands.slice(0, limit).map((c) => {
      const r: SearchResult = this.place(c.p);
      if (c.kind >= 2) r.matchedName = this.row(c.p)[3]!.split('|')[c.kind - 2]!;
      return r;
    });
  }

  private row(i: number): string[] {
    const s = this.rowStart[i]!;
    return this.text.slice(s, this.text.indexOf('\n', s)).split('\t');
  }

  private matchesFilters(f: string[], filters: string[]): boolean {
    const cc = f[6]!;
    const parts = [
      this.admin2.get(`${cc}.${f[7]}.${f[8]}`) ?? '',
      this.admin1.get(`${cc}.${f[7]}`) ?? '',
      this.countries.get(cc) ?? '',
    ].map(normalize);
    parts.push(cc.toLowerCase());
    return filters.every((flt) => parts.some((part) => part.startsWith(flt)));
  }

  private place(i: number): Place {
    const f = this.row(i);
    const name = f[1]!;
    const asciiName = f[2] || name;
    const cc = f[6]!;
    const a1 = f[7]!;
    const a2 = f[8]!;
    const country = this.countries.get(cc) ?? '';
    const admin1 = a1 ? this.admin1.get(`${cc}.${a1}`) ?? '' : '';
    const admin2 = a1 && a2 ? this.admin2.get(`${cc}.${a1}.${a2}`) ?? '' : '';
    const tz = f[11] ? this.zones[Number(f[11])] ?? '' : '';
    return {
      id: Number(f[0]),
      name,
      asciiName,
      label: makeLabel([asciiOnly(asciiName), asciiOnly(cleanAdmin(admin2)), asciiOnly(cleanAdmin(admin1)), country]),
      lat: Number(f[4]),
      lng: Number(f[5]),
      timeZone: tz,
      countryCode: cc,
      country,
      admin1Code: a1,
      admin1,
      admin2Code: a2,
      admin2,
      population: f[9] ? Number(f[9]) : 0,
      featureCode: f[10]!,
    };
  }
}

/**
 * Plain letters (D-087): accents removed and the few remaining Latin letters spelled out
 * ("Curaçao" → "Curacao", "Hœnheim" → "Hoenheim"; GeoNames' ASCII names still contain œ).
 */
function asciiOnly(s: string): string {
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'Oe').replace(/æ/g, 'ae').replace(/Æ/g, 'Ae')
    .replace(/ß/g, 'ss').replace(/ø/g, 'o').replace(/Ø/g, 'O').replace(/ł/g, 'l').replace(/Ł/g, 'L')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/þ/g, 'th').replace(/Þ/g, 'Th').replace(/ı/g, 'i');
}

/** Drops the words "District" and "Division" (D-087): "Malda District" → "Malda". */
function cleanAdmin(s: string): string {
  return s.replace(/\b(District|Division)\b/gi, ' ').replace(/\s+/g, ' ').trim();
}

/** Joins the non-empty parts, leaving out a part that repeats an earlier one ("Kolkata, Kolkata"). */
function makeLabel(parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const k = normalize(part);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(part);
  }
  return out.join(', ');
}

