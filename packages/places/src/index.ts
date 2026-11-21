/**
 * @jathag/places — birth-place search over the GeoNames place index (step 0.2.11).
 *
 * Pure TypeScript, no UI, no file access (see `./node.ts` for loading the index file in Node).
 * Nothing here logs or stores queries: a birthplace is birth data (FR-API-02).
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
  /** "Place, District, State, Country"; parts GeoNames does not have are left out (FR-IN-04). */
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
  /** GeoNames feature codes to leave out, e.g. ['PPLQ', 'PPLH', 'PPLW']. Default: none. */
  excludeFeatureCodes?: readonly string[];
}

/** Queries shorter than this (after normalising) return no results. */
export const MIN_QUERY_LENGTH = 2;

const KIND_NAME = 0;
const KIND_ASCII = 1;
const KIND_ALT = 2;

/** Bigger settlement types first when population is equal (mostly villages with no population figure). */
const FEATURE_RANK: Record<string, number> = {
  PPLC: 0, PPLA: 1, PPLA2: 2, PPLA3: 3, PPLA4: 4, PPLA5: 5, PPLG: 5, PPL: 6, PPLS: 7, PPLF: 7,
  PPLR: 7, PPLL: 7, PPLX: 8, STLMT: 8, PPLCH: 9, PPLH: 9, PPLQ: 9, PPLW: 9,
};

export class PlaceIndex {
  /** Number of places. */
  readonly size: number;
  /** SHA-256 of each GeoNames source file, from the index header. */
  readonly sources: ReadonlyArray<{ name: string; sha256: string }>;

  private readonly ids: Int32Array;
  private readonly names: string[];
  private readonly asciiNames: string[];
  private readonly alts: string[];
  private readonly lat: Float64Array;
  private readonly lng: Float64Array;
  private readonly pop: Float64Array;
  private readonly tz: Uint16Array;
  private readonly cc: string[];
  private readonly a1: string[];
  private readonly a2: string[];
  private readonly fcode: string[];
  private readonly zones: string[];
  private readonly countries: Map<string, string>;
  private readonly admin1: Map<string, string>;
  private readonly admin2: Map<string, string>;
  private readonly idToIdx: Map<number, number>;

  // Search keys, sorted: keys[i] belongs to place keyPlace[i]; keyKind[i] = name/ascii/alt
  // (for alt: keyAlt[i] = position in that place's alternate-name list).
  private readonly keys: string[];
  private readonly keyPlace: Int32Array;
  private readonly keyKind: Uint8Array;
  private readonly keyAlt: Uint16Array;

  /** Parses the text of places.tsv (see data/places/README.md for the format). */
  constructor(text: string) {
    const lines = text.split('\n');
    if (!lines[0]?.startsWith('JATHAG-PLACES\t1')) throw new Error('Not a Jathag place index (format 1)');
    const sources: { name: string; sha256: string }[] = [];
    this.zones = [];
    this.countries = new Map();
    this.admin1 = new Map();
    this.admin2 = new Map();
    let first = 1;
    for (; first < lines.length; first++) {
      const l = lines[first]!;
      if (l[0] !== '#') break;
      const f = l.split('\t');
      switch (f[0]) {
        case '#S': sources.push({ name: f[1]!, sha256: f[2]! }); break;
        case '#Z': this.zones[Number(f[1])] = f[2]!; break;
        case '#C': this.countries.set(f[1]!, f[2]!); break;
        case '#1': this.admin1.set(f[1]!, f[2]!); break;
        case '#2': this.admin2.set(f[1]!, f[2]!); break;
      }
    }
    this.sources = sources;
    let n = lines.length - first;
    while (n > 0 && lines[first + n - 1] === '') n--;
    this.size = n;
    this.ids = new Int32Array(n);
    this.names = new Array(n);
    this.asciiNames = new Array(n);
    this.alts = new Array(n);
    this.lat = new Float64Array(n);
    this.lng = new Float64Array(n);
    this.pop = new Float64Array(n);
    this.tz = new Uint16Array(n);
    this.cc = new Array(n);
    this.a1 = new Array(n);
    this.a2 = new Array(n);
    this.fcode = new Array(n);
    this.idToIdx = new Map();

    const keyList: { k: string; p: number; kind: number; alt: number }[] = [];
    for (let i = 0; i < n; i++) {
      const f = lines[first + i]!.split('\t');
      const id = Number(f[0]);
      this.ids[i] = id;
      this.idToIdx.set(id, i);
      const name = f[1]!;
      const ascii = f[2] || name;
      this.names[i] = name;
      this.asciiNames[i] = ascii;
      this.alts[i] = f[3]!;
      this.lat[i] = Number(f[4]);
      this.lng[i] = Number(f[5]);
      this.cc[i] = f[6]!;
      this.a1[i] = f[7]!;
      this.a2[i] = f[8]!;
      this.pop[i] = f[9] ? Number(f[9]) : 0;
      this.fcode[i] = f[10]!;
      this.tz[i] = f[11] ? Number(f[11]) : 0xffff;

      const kName = normalize(name);
      keyList.push({ k: kName, p: i, kind: KIND_NAME, alt: 0 });
      const kAscii = normalize(ascii);
      if (kAscii !== kName) keyList.push({ k: kAscii, p: i, kind: KIND_ASCII, alt: 0 });
      if (f[3]) {
        const altNames = f[3].split('|');
        for (let a = 0; a < altNames.length; a++) {
          keyList.push({ k: normalize(altNames[a]!), p: i, kind: KIND_ALT, alt: a });
        }
      }
    }
    keyList.sort((x, y) => (x.k < y.k ? -1 : x.k > y.k ? 1 : x.p - y.p || x.kind - y.kind));
    const m = keyList.length;
    this.keys = new Array(m);
    this.keyPlace = new Int32Array(m);
    this.keyKind = new Uint8Array(m);
    this.keyAlt = new Uint16Array(m);
    for (let j = 0; j < m; j++) {
      const e = keyList[j]!;
      this.keys[j] = e.k;
      this.keyPlace[j] = e.p;
      this.keyKind[j] = e.kind;
      this.keyAlt[j] = e.alt;
    }
  }

  /** Number of search keys (names + ASCII names + alternate names). */
  get keyCount(): number {
    return this.keys.length;
  }

  /** The place with this GeoNames id, or undefined. */
  get(id: number): Place | undefined {
    const i = this.idToIdx.get(id);
    return i === undefined ? undefined : this.place(i);
  }

  /** Calls fn for every place (for tests and reports). */
  forEach(fn: (p: Place) => void): void {
    for (let i = 0; i < this.size; i++) fn(this.place(i));
  }

  /**
   * Type-ahead search. Case- and accent-insensitive prefix match on the place name, its
   * ASCII name and its kept alternate/old names. Text after a comma narrows the result:
   * "aurangabad, bihar" keeps only places whose district, state or country starts with "bihar".
   *
   * Ranking: exact name matches first, then larger population (a match on an alternate name
   * counts as 10× smaller, because GeoNames alternate names include many foreign-language
   * spellings), then bigger settlement type
   * (capital > state/district seat > town > neighbourhood > abandoned/historical), then a
   * match on the main name before an alternate name, then GeoNames id (so it is stable).
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const limit = options.limit ?? 10;
    const exclude = options.excludeFeatureCodes ? new Set(options.excludeFeatureCodes) : undefined;
    const [head = '', ...rest] = query.split(',');
    const q = normalize(head);
    if (q.length < MIN_QUERY_LENGTH || limit <= 0) return [];
    const filters = rest.map(normalize).filter((s) => s.length > 0);

    // Binary search for the first key >= q, then walk while keys start with q.
    let lo = 0;
    let hi = this.keys.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.keys[mid]! < q) lo = mid + 1; else hi = mid;
    }
    // Best key per place: exact (1/0), kind (lower better), key position.
    const best = new Map<number, number>();
    for (let j = lo; j < this.keys.length; j++) {
      const k = this.keys[j]!;
      if (!k.startsWith(q)) break;
      const p = this.keyPlace[j]!;
      const prev = best.get(p);
      if (prev === undefined || this.better(j, prev, q)) best.set(p, j);
    }

    const cands: { p: number; j: number; exact: boolean }[] = [];
    for (const [p, j] of best) {
      if (exclude?.has(this.fcode[p]!)) continue;
      if (filters.length > 0 && !this.matchesFilters(p, filters)) continue;
      cands.push({ p, j, exact: this.keys[j] === q });
    }
    cands.sort((x, y) => {
      if (x.exact !== y.exact) return x.exact ? -1 : 1;
      const dp = this.rankPop(y.p, y.j) - this.rankPop(x.p, x.j);
      if (dp !== 0) return dp;
      const df = (FEATURE_RANK[this.fcode[x.p]!] ?? 6) - (FEATURE_RANK[this.fcode[y.p]!] ?? 6);
      if (df !== 0) return df;
      const dk = (this.keyKind[x.j] === KIND_ALT ? 1 : 0) - (this.keyKind[y.j] === KIND_ALT ? 1 : 0);
      if (dk !== 0) return dk;
      return this.ids[x.p]! - this.ids[y.p]!;
    });

    return cands.slice(0, limit).map(({ p, j }) => {
      const r: SearchResult = this.place(p);
      if (this.keyKind[j] === KIND_ALT) r.matchedName = this.alts[p]!.split('|')[this.keyAlt[j]!]!;
      return r;
    });
  }

  /** Population used for ranking; a match on an alternate name counts as a place 10× smaller. */
  private rankPop(p: number, j: number): number {
    return this.keyKind[j] === KIND_ALT ? this.pop[p]! / 10 : this.pop[p]!;
  }

  private better(j: number, prev: number, q: string): boolean {
    const ej = this.keys[j] === q;
    const ep = this.keys[prev] === q;
    if (ej !== ep) return ej;
    return this.keyKind[j]! < this.keyKind[prev]!;
  }

  private matchesFilters(p: number, filters: string[]): boolean {
    const cc = this.cc[p]!;
    const parts = [
      this.admin2.get(`${cc}.${this.a1[p]}.${this.a2[p]}`) ?? '',
      this.admin1.get(`${cc}.${this.a1[p]}`) ?? '',
      this.countries.get(cc) ?? '',
    ].map(normalize);
    parts.push(cc.toLowerCase());
    return filters.every((f) => parts.some((part) => part.startsWith(f)));
  }

  private place(i: number): Place {
    const cc = this.cc[i]!;
    const a1 = this.a1[i]!;
    const a2 = this.a2[i]!;
    const country = this.countries.get(cc) ?? '';
    const admin1 = a1 ? this.admin1.get(`${cc}.${a1}`) ?? '' : '';
    const admin2 = a1 && a2 ? this.admin2.get(`${cc}.${a1}.${a2}`) ?? '' : '';
    const name = this.names[i]!;
    return {
      id: this.ids[i]!,
      name,
      asciiName: this.asciiNames[i]!,
      label: [name, admin2, admin1, country].filter((s) => s.length > 0).join(', '),
      lat: this.lat[i]!,
      lng: this.lng[i]!,
      timeZone: this.tz[i] === 0xffff ? '' : this.zones[this.tz[i]!]!,
      countryCode: cc,
      country,
      admin1Code: a1,
      admin1,
      admin2Code: a2,
      admin2,
      population: this.pop[i]!,
      featureCode: this.fcode[i]!,
    };
  }
}
