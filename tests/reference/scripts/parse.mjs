// Reads the JHora 8.0 answer key in tests/reference/raw/ and turns it into clean expected data.
// Pure parsing: no astronomy here (that is the engine's job, step 0.2.8).
//
// Used by convert.mjs (writes expected/*.json) and by checks.test.ts (re-parses and compares).

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  BODIES, SIGN_ABBR, TABLE_BODY, CHART_BODY, CHART_IGNORED, DASHA_LORD, HORA_LORD,
  NAKSHATRA_ABBR, NAKSHATRA_FULL, WEEKDAYS, TITHI_NAMES, PURNIMA, AMAVASYA, YOGAS, KARANAS,
  LUNAR_MONTHS, SAMVATSARAS, idOf,
} from './ids.mjs';

export const REF_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
export const RAW_DIR = join(REF_DIR, 'raw');
export const EXPECTED_DIR = join(REF_DIR, 'expected');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
const pad = (n, w = 2) => String(n).padStart(w, '0');
const round2 = (x) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------- PDF text

async function readPdf(file) {
  const data = new Uint8Array(readFileSync(file));
  const task = getDocument({ data, verbosity: 0, isEvalSupported: false });
  const doc = await task.promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    pages.push(tc.items
      .filter((it) => it.str.trim() !== '')
      .map((it) => ({ x: it.transform[4], y: it.transform[5], s: it.str })));
  }
  await task.destroy();
  return pages;
}

/** Group items into text lines (same y within tolerance), each line sorted left→right. */
function lines(items, tol = 1) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const out = [];
  for (const it of sorted) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.y - it.y) <= tol) last.items.push(it);
    else out.push({ y: it.y, items: [it] });
  }
  for (const l of out) {
    l.items.sort((a, b) => a.x - b.x);
    l.text = l.items.map((i) => i.s.trim()).join(' ');
  }
  return out;
}

// ---------------------------------------------------------------- helpers

function signFromAbbr(a) {
  const i = SIGN_ABBR.indexOf(a);
  if (i < 0) throw new Error(`Unknown sign abbreviation "${a}"`);
  return i + 1;
}

function nakshatraFromAbbr(a) {
  const i = NAKSHATRA_ABBR.findIndex((al) => al.includes(a));
  if (i < 0) throw new Error(`Unknown nakshatra abbreviation "${a}"`);
  return i + 1;
}

/** "6:45:00 (5:30 East of GMT)" → { time, utcOffsetMinutes } */
function parseTimeLine(s) {
  const m = s.match(/^(\d{1,2}):(\d\d):(\d\d) \((\d{1,2}):(\d\d) (East|West) of GMT\)$/);
  if (!m) throw new Error(`Bad time line "${s}"`);
  const off = (Number(m[4]) * 60 + Number(m[5])) * (m[6] === 'East' ? 1 : -1);
  return { time: `${pad(m[1])}:${m[2]}:${m[3]}`, utcOffsetMinutes: off };
}

/** "80 E 17' 00\", 13 N 05' 00\" (Chennai, India)" → decimal degrees (E and N positive). */
function parseCoordLine(s) {
  const m = s.match(/^(\d{1,3}) ([EW]) (\d\d)' (\d\d)", (\d{1,2}) ([NS]) (\d\d)' (\d\d)" \((.*)\)$/);
  if (!m) throw new Error(`Bad coordinates line "${s}"`);
  const lng = (Number(m[1]) + Number(m[3]) / 60 + Number(m[4]) / 3600) * (m[2] === 'E' ? 1 : -1);
  const lat = (Number(m[5]) + Number(m[7]) / 60 + Number(m[8]) / 3600) * (m[6] === 'N' ? 1 : -1);
  return { lat, lng, placeLabel: m[9] };
}

/** "August 14, 1992" → "1992-08-14" */
function parseDateLine(s) {
  const m = s.match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (!m || MONTHS.indexOf(m[1]) < 0) throw new Error(`Bad date line "${s}"`);
  return `${m[3]}-${pad(MONTHS.indexOf(m[1]) + 1)}-${pad(m[2])}`;
}

/** Local date+time on a fixed UTC offset → ISO UTC string (whole seconds). */
export function localToUtc(date, time, utcOffsetMinutes) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi, s] = time.split(':').map(Number);
  const ms = Date.UTC(y, mo - 1, d, h, mi, s) - utcOffsetMinutes * 60000;
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

// ---------------------------------------------------------------- page 1: birth block, table, panchanga

function parseBirthBlock(page1) {
  const block = lines(page1.filter((i) => i.x < 40 && i.y > 570 && i.y < 700)).map((l) => l.text);
  if (block.length !== 7) throw new Error(`Birth block has ${block.length} lines, expected 7`);
  const [name, dateLine, timeLine, coordLine, lunarLine, nakLine, dayLine] = block;
  const { time, utcOffsetMinutes } = parseTimeLine(timeLine);
  const { lat, lng, placeLabel } = parseCoordLine(coordLine);
  return {
    printed: {
      name, date: parseDateLine(dateLine), time, utcOffsetMinutes,
      lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), placeLabel,
      lines: [dateLine, timeLine, coordLine],
    },
    panchanga: parsePanchanga(lunarLine, nakLine, dayLine),
  };
}

function parsePanchanga(lunarLine, nakLine, dayLine) {
  // "Lunar day: Angirasa Sravana Krishna Pratipat (44.04% left)"
  // "Lunar day: Dhaata Nija Bhadrapada Krishna Dwitiya (70.37% left)"
  // "Lunar day: Bhava Margasira Amavasya (79.56% left)"
  const lm = lunarLine.match(/^Lunar day: (\S+) (?:(Nija|Adhika) )?(\S+) (?:(Sukla|Krishna) )?(\S+) \(([\d.]+)% left\)$/);
  if (!lm) throw new Error(`Bad lunar day line "${lunarLine}"`);
  const [, samv, nijaAdhika, month, paksha, tithiName, tithiLeft] = lm;
  let tithi;
  if (PURNIMA.includes(tithiName)) tithi = 15;
  else if (AMAVASYA.includes(tithiName)) tithi = 30;
  else {
    if (!paksha) throw new Error(`Tithi "${tithiName}" without paksha`);
    tithi = idOf(TITHI_NAMES, tithiName, 'tithi') + (paksha === 'Krishna' ? 15 : 0);
  }
  if ((tithi === 15 || tithi === 30) && paksha) throw new Error(`Unexpected paksha for ${tithiName}`);

  const nm = nakLine.match(/^Nakshatra: (.+) \(([\d.]+)% left\)$/);
  if (!nm) throw new Error(`Bad nakshatra line "${nakLine}"`);

  // "Friday, Sobhana Yoga, Kaulava Karana, Venus Hora"
  const dm = dayLine.match(/^(\w+), (.+) Yoga, (.+) Karana, (\w+) Hora$/);
  if (!dm) throw new Error(`Bad weekday line "${dayLine}"`);
  const weekday = WEEKDAYS.indexOf(dm[1]) + 1;
  if (weekday === 0) throw new Error(`Unknown weekday "${dm[1]}"`);
  const horaLord = HORA_LORD[dm[4]];
  if (!horaLord) throw new Error(`Unknown hora lord "${dm[4]}"`);

  return {
    samvatsara: idOf(SAMVATSARAS, samv, 'samvatsara'),
    lunarMonth: idOf(LUNAR_MONTHS, month, 'lunar month'),
    lunarMonthKind: nijaAdhika ? nijaAdhika.toLowerCase() : null,
    tithi,
    tithiLeftPercent: Number(tithiLeft),
    nakshatra: idOf(NAKSHATRA_FULL, nm[1], 'nakshatra'),
    nakshatraLeftPercent: Number(nm[2]),
    weekday,
    yoga: idOf(YOGAS, dm[2], 'yoga'),
    karana: idOf(KARANAS, dm[3], 'karana'),
    horaLord,
    printed: [lunarLine, nakLine, dayLine],
  };
}

const ROW_RE = /^(.+?)\s+(\d{1,2}) ([A-Z][a-z]) (\d\d)' (\d\d\.\d\d)"\s+(\S+)\s+([1-4])\s+([A-Z][a-z])\s+([A-Z][a-z])$/;

function parseTable(page1) {
  const rows = lines(page1.filter((i) => i.x >= 300 && i.y > 570 && i.y < 762));
  const bodies = {};
  for (const row of rows) {
    const m = row.text.match(ROW_RE);
    if (!m) throw new Error(`Bad table row "${row.text}"`);
    const nameM = m[1].match(/^(\w+)( \(R\))?( - \w+)?$/);
    const code = nameM && TABLE_BODY[nameM[1]];
    if (!code) continue; // Maandi, Gulika, special lagnas: not tested (yet)
    if (bodies[code]) throw new Error(`Duplicate table row for ${code}`);
    const sign = signFromAbbr(m[3]);
    const deg = Number(m[2]), min = Number(m[4]), sec = Number(m[5]);
    if (deg > 29 || min > 59 || sec >= 60) throw new Error(`Bad longitude in "${row.text}"`);
    bodies[code] = {
      lonArcsec: round2((sign - 1) * 108000 + deg * 3600 + min * 60 + sec),
      printedLongitude: `${m[2]} ${m[3]} ${m[4]}' ${m[5]}"`,
      sign: signFromAbbr(m[8]), // the Rasi column
      nakshatra: nakshatraFromAbbr(m[6]),
      pada: Number(m[7]),
      navamsaSign: signFromAbbr(m[9]),
      retrograde: Boolean(nameM[2]),
      longitudeSign: sign, // sign written inside the longitude (checked against the Rasi column)
    };
  }
  for (const b of BODIES) if (!bodies[b]) throw new Error(`Table row missing for ${b}`);
  return bodies;
}

// ---------------------------------------------------------------- Vimshottari table (page 1, bottom)

const LORD_RE = '(Sun|Moon|Mars|Merc|Jup|Ven|Sat|Rah|Ket)';

function parseDashaTable(page1) {
  const region = page1.filter((i) => i.y < 290 && i.y > 25);
  const mdLabels = region.filter((i) => i.x < 50).sort((a, b) => b.y - a.y);
  const adText = lines(region.filter((i) => i.x >= 50), 1).map((l) => l.text).join(' ');
  const ads = [...adText.matchAll(new RegExp(`${LORD_RE}\\s*(\\d{4}-\\d\\d-\\d\\d)`, 'g'))]
    .map((m) => ({ lord: DASHA_LORD[m[1]], startDate: m[2] }));
  const leftover = adText.replace(new RegExp(`${LORD_RE}\\s*(\\d{4}-\\d\\d-\\d\\d)`, 'g'), '').trim();
  if (leftover) throw new Error(`Unparsed text in dasha table: "${leftover}"`);
  if (mdLabels.length !== 9) throw new Error(`Found ${mdLabels.length} mahadashas, expected 9`);
  if (ads.length !== 81) throw new Error(`Found ${ads.length} antardashas, expected 81`);
  return mdLabels.map((md, k) => {
    const lord = DASHA_LORD[md.s.trim()];
    if (!lord) throw new Error(`Unknown mahadasha lord "${md.s}"`);
    const antardashas = ads.slice(k * 9, k * 9 + 9);
    return { lord, startDate: antardashas[0].startDate, antardashas };
  });
}

// ---------------------------------------------------------------- South Indian chart grids

// Fixed South Indian layout: [row][col], row 0 = top. null = the centre (title area).
const SOUTH_GRID = [
  [12, 1, 2, 3],
  [11, null, null, 4],
  [10, null, null, 5],
  [9, 8, 7, 6],
];
// Geometry of JHora's printed chart, measured from the "Natal Chart" title (points).
const CELL_W = 60.4;
const CELL_H = 52.8;
const TITLE_TO_CENTRE = { dx: 19.0, dy: -40.5 };

function parseCharts(pages) {
  const charts = {};
  pages.forEach((items, p) => {
    const centres = items.filter((i) => i.s.trim() === 'Natal Chart')
      .map((t) => ({ x: t.x + TITLE_TO_CENTRE.dx, y: t.y + TITLE_TO_CENTRE.dy, labels: [], cells: [] }));
    for (const it of items) {
      for (const c of centres) {
        const col = Math.floor((it.x - c.x) / CELL_W + 2);
        const row = Math.floor((c.y - it.y) / CELL_H + 2);
        if (col < 0 || col > 3 || row < 0 || row > 3) continue;
        if (SOUTH_GRID[row][col] === null) c.labels.push(it);
        else c.cells.push({ sign: SOUTH_GRID[row][col], s: it.s });
      }
    }
    for (const c of centres) {
      const labelText = lines(c.labels).map((l) => l.text);
      let division = null;
      for (const t of labelText) {
        const m = t.match(/^D-(\d+)( \((Trd|CnL)\))?$/);
        if (m) division = Number(m[1]);
        if (t === 'Rasi') division = 1;
      }
      if (division === null) throw new Error(`Page ${p + 1}: chart without a D-number (${labelText.join(' / ')})`);
      if (charts[division]) throw new Error(`Chart D-${division} appears twice`);
      const signs = {};
      const retro = {};
      for (const cell of c.cells) {
        for (const tok of cell.s.trim().split(/\s+/)) {
          const bare = tok.replace(/^\((.*)\)$/, '$1');
          const code = CHART_BODY[bare];
          if (!code) {
            if (!CHART_IGNORED.test(bare)) throw new Error(`D-${division}: unknown chart label "${tok}"`);
            continue;
          }
          if (signs[code]) throw new Error(`D-${division}: ${code} appears twice`);
          signs[code] = cell.sign;
          retro[code] = bare !== tok;
        }
      }
      for (const b of BODIES) if (!signs[b]) throw new Error(`D-${division}: ${b} missing from the chart`);
      charts[division] = { signs, retro, label: labelText.join(' / ') };
    }
  });
  return charts;
}

// ---------------------------------------------------------------- pratyantardasha .txt files

const TXT_RANGE = `(\\d{4}-\\d\\d-\\d\\d) \\((\\d{1,2}:\\d\\d:\\d\\d)\\) - (\\d{4}-\\d\\d-\\d\\d) \\((\\d{1,2}:\\d\\d:\\d\\d)\\)`;

function moment(date, time, off) {
  const t = time.split(':').map((x) => pad(Number(x))).join(':');
  return { local: `${date}T${t}`, utc: localToUtc(date, t, off) };
}

function parsePratyantar(text, off) {
  const blocks = [];
  let md = null;
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    let m;
    if ((m = line.match(new RegExp(`^${LORD_RE} MD: ${TXT_RANGE}$`)))) {
      md = { lord: DASHA_LORD[m[1]], start: moment(m[2], m[3], off), end: moment(m[4], m[5], off) };
    } else if ((m = line.match(new RegExp(`^${LORD_RE} AD: ${TXT_RANGE}$`)))) {
      if (!md) throw new Error('AD before MD in pratyantar file');
      cur = {
        mahadasha: md,
        antardasha: { lord: DASHA_LORD[m[1]], start: moment(m[2], m[3], off), end: moment(m[4], m[5], off) },
        pratyantardashas: [],
      };
      blocks.push(cur);
    } else if ((m = line.match(new RegExp(`^${LORD_RE}: ${TXT_RANGE}$`)))) {
      if (!cur) throw new Error('Pratyantardasha before AD in pratyantar file');
      cur.pratyantardashas.push({ lord: DASHA_LORD[m[1]], start: moment(m[2], m[3], off), end: moment(m[4], m[5], off) });
    } else if (line && !/^(r\d\d-pratyantar|Vimsottari Dasa:|Pratyantardasas in this AD:)$/.test(line)) {
      throw new Error(`Unrecognised line in pratyantar file: "${line}"`);
    }
  }
  return blocks;
}

// ---------------------------------------------------------------- JHora birth file (.jhd)

/** Lines 1–7 of a .jhd: month, day, year, time (H.MM, fractional minutes), −offset (H.MM), −longitude (D.MM), latitude (D.MM). */
function parseJhd(text) {
  const v = text.split(/\r?\n/).map((s) => s.trim());
  const hmm = (x) => {
    const a = Math.abs(Number(x));
    const h = Math.floor(a + 1e-9);
    return { h, m: round2((a - h) * 100), sign: Number(x) < 0 ? -1 : 1 };
  };
  const t = hmm(v[3]);
  const off = hmm(v[4]);
  const sec = Math.round(t.m * 60);
  // Coordinates are D.MMmmmm with *decimal* minutes (R26: 72.557167 = 72° 55.7167′ = 72° 55′ 43″),
  // so the minutes must not be rounded to 2 decimals the way the time's minutes are.
  const deg = (x) => {
    const a = Math.abs(Number(x));
    const d = Math.floor(a + 1e-9);
    return (Number(x) < 0 ? -1 : 1) * (d + ((a - d) * 100) / 60);
  };
  return {
    date: `${v[2]}-${pad(v[0])}-${pad(v[1])}`,
    time: `${pad(t.h)}:${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`,
    utcOffsetMinutes: -off.sign * (off.h * 60 + Math.round(off.m)),
    lng: Number((-deg(v[5])).toFixed(6)),
    lat: Number(deg(v[6]).toFixed(6)),
  };
}

// ---------------------------------------------------------------- one birth

export async function convertBirth(id) {
  const n = id.slice(1).padStart(2, '0');
  const pdf = join(RAW_DIR, `r${n}.pdf`);
  const pages = await readPdf(pdf);
  const page1 = pages[0];
  const { printed, panchanga } = parseBirthBlock(page1);
  const off = printed.utcOffsetMinutes;

  const txt = join(RAW_DIR, `r${n}-pratyantar.txt`);
  const pratyantar = existsSync(txt) ? parsePratyantar(readFileSync(txt, 'utf8'), off) : null;

  const charts = parseCharts(pages);
  const divisional = {};
  const chartRetrograde = {};
  for (const d of Object.keys(charts).map(Number).sort((a, b) => a - b)) {
    divisional[d] = charts[d].signs;
    chartRetrograde[d] = charts[d].retro;
  }

  return {
    id,
    sources: [`raw/r${n}.pdf`, `raw/r${n}.jhd`, ...(pratyantar ? [`raw/r${n}-pratyantar.txt`] : [])],
    jhoraClockUtcOffsetMinutes: off,
    printed: { ...printed, utc: localToUtc(printed.date, printed.time, off) },
    jhd: parseJhd(readFileSync(join(RAW_DIR, `r${n}.jhd`), 'utf8')),
    bodies: parseTable(page1),
    panchanga,
    vimshottari: parseDashaTable(page1),
    pratyantardashas: pratyantar,
    divisional,
    chartRetrograde,
  };
}

export function loadBirths() {
  return JSON.parse(readFileSync(join(REF_DIR, 'births.json'), 'utf8')).births;
}

export async function convertAll() {
  const out = [];
  for (const b of loadBirths()) out.push(await convertBirth(b.id));
  return out;
}
