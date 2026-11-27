// How a saved profile travels between pages (step 0.4.7, D-136 items 2 and 3; step 0.5.1, D-138): only
// its id, in the address, never a birth detail. Since 0.5.1 both go to the chart page:
// "/chart?profile=<id>" opens it, "/chart?profile=<id>&edit" opens it with the edit panel open.
// The 0.4.7 home-form links ("/?profile=<id>", "/?edit=<id>") are still read, and sent on to /chart.

import { chartHref } from "./chart-page";

export type ProfileLinkMode = "open" | "edit";

/** A profile id is made by crypto.randomUUID (or the fallback): letters, digits and dashes only. */
const ID = /^[A-Za-z0-9-]{1,64}$/;

export function profileHref(mode: ProfileLinkMode, id: string): string {
  return chartHref(id, mode === "edit");
}

/** An old home-form link ("?profile=…" or "?edit=…"), or null. */
export function profileFromUrl(search: string): { mode: ProfileLinkMode; id: string } | null {
  const q = new URLSearchParams(search);
  const open = q.get("profile");
  if (open && ID.test(open)) return { mode: "open", id: open };
  const edit = q.get("edit");
  if (edit && ID.test(edit)) return { mode: "edit", id: edit };
  return null;
}
