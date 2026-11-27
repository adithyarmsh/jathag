// The muted second line of a place suggestion (D-091 item 4, spec §5.2): "also known as Bombay" when
// the search matched an alternate or old name rather than the place's main name. Pure function.

import { fill } from "./chart-format";
import type { Messages } from "./i18n";

export function alsoKnownAsLine(result: { matchedName?: string }, t: Messages["form"]["place"]): string | null {
  return result.matchedName ? fill(t.alsoKnownAs, { name: result.matchedName }) : null;
}
