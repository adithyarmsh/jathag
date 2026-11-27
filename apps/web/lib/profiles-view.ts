// What the /profiles page and the phone menu show for saved profiles (step 0.4.7, spec §4 and §11).
// Pure functions, tested in profiles.test.ts.

import { fill } from "./chart-format";
import { formatCoordinateShort, parseCoordinate } from "./coordinates";
import type { Messages } from "./i18n";
import type { Profile } from "./profiles";
import { to12hText } from "./time-12h";

export interface ProfileCardView {
  id: string;
  name: string;
  /** "14 Aug 1992 · 6:45 AM" (with seconds when they were saved: "6:45:30 AM") */
  when: string;
  /** The place's label, or the typed coordinates "13° 05′ N · 80° 17′ E" */
  place: string;
}

export function profileCardView(p: Profile, t: Messages): ProfileCardView {
  const [y, m, d] = p.birth.date.split("-").map(Number);
  const date = `${d} ${t.form.date.monthsShort[m! - 1]} ${y}`;
  const tm = p.birth.time;
  const h24 = (Number(tm.hour) % 12) + (tm.period === "pm" ? 12 : 0);
  const two = (v: string | number) => String(v).padStart(2, "0");
  const time24 = `${two(h24)}:${two(tm.minute)}${tm.second === null ? "" : `:${two(tm.second)}`}`;
  const time = to12hText(time24, t.form.time.am, t.form.time.pm);
  let place: string;
  if (p.birth.where.kind === "place") place = p.birth.where.place.label;
  else {
    const lat = parseCoordinate(p.birth.where.manual.lat, "lat");
    const lng = parseCoordinate(p.birth.where.manual.lng, "lng");
    place =
      lat !== null && lng !== null
        ? fill(t.chart.manualPlace, { lat: formatCoordinateShort(lat, "lat"), lng: formatCoordinateShort(lng, "lng") })
        : `${p.birth.where.manual.lat}, ${p.birth.where.manual.lng}`;
  }
  return { id: p.id, name: p.name, when: fill(t.profiles.when, { date, time }), place };
}

/**
 * After a card is deleted, where keyboard focus goes: the next card, else the one before it, else
 * (no cards left) null = the "New chart" button. `ids` is the order on screen before deleting.
 */
export function focusAfterDelete(ids: readonly string[], deleted: string): string | null {
  const i = ids.indexOf(deleted);
  if (i < 0) return null;
  return ids[i + 1] ?? ids[i - 1] ?? null;
}

/** The phone menu's sub-line under "Saved profiles" (spec §4): "3 in this browser". */
export function profilesMenuSub(count: number | null, t: Messages["menu"]): string {
  if (!count) return t.subs.profiles; // none, or not read yet / storage blocked: "Kept in this browser"
  return count === 1 ? t.profilesCountOne : fill(t.profilesCount, { n: count });
}
