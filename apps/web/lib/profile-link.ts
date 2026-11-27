// How a saved profile travels from /profiles to the home form (step 0.4.7, D-136 items 2 and 3): only
// its id, in the address, never a birth detail. "/?profile=<id>" opens it (filled and calculated),
// "/?edit=<id>" fills the form for editing. The form takes the id out of the address once loaded.

export type ProfileLinkMode = "open" | "edit";

/** A profile id is made by crypto.randomUUID (or the fallback): letters, digits and dashes only. */
const ID = /^[A-Za-z0-9-]{1,64}$/;

export function profileHref(mode: ProfileLinkMode, id: string): string {
  return `/?${mode === "open" ? "profile" : "edit"}=${encodeURIComponent(id)}`;
}

/** The profile asked for by the address ("?profile=…" or "?edit=…"), or null. */
export function profileFromUrl(search: string): { mode: ProfileLinkMode; id: string } | null {
  const q = new URLSearchParams(search);
  const open = q.get("profile");
  if (open && ID.test(open)) return { mode: "open", id: open };
  const edit = q.get("edit");
  if (edit && ID.test(edit)) return { mode: "edit", id: edit };
  return null;
}
