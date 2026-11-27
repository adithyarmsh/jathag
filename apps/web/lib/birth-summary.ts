// The details line under every result card's heading ("14 August 1992 · 6:45 AM (06:45) · Chennai,
// Tamil Nadu, India"), with the name first when one was typed (D-134 item 2: the name is shown here
// but never sent to the server). Pure function.

import { fill } from "./chart-format";
import { to12hText } from "./time-12h";
import type { Messages } from "./i18n";

export interface SummaryInput {
  /** As typed; blank or spaces = no name. */
  name: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" or "HH:MM:SS" (24-hour) */
  time: string;
  /** The place label, or the typed coordinates ("13° 05′ N · 80° 16′ E"). */
  place: string;
  repeatedTime: "earlier" | "later" | null;
}

export function birthSummary(input: SummaryInput, t: Pick<Messages, "chart" | "form">) {
  const f = t.form;
  const [y, m, d] = input.date.split("-").map(Number);
  const when = `${d} ${f.date.months[m! - 1]} ${y}`;
  const which = input.repeatedTime
    ? ` (${input.repeatedTime === "earlier" ? f.repeatedTime.summaryEarlier : f.repeatedTime.summaryLater})`
    : "";
  const time12 = to12hText(input.time, f.time.am, f.time.pm);
  const shownTime = fill(t.chart.summaryTime, { time12, time24: input.time });
  const name = input.name.trim();
  const parts = { date: when, time: shownTime + which, place: input.place };
  return {
    summary: name ? fill(t.chart.summaryNamed, { name, ...parts }) : fill(t.chart.summary, parts),
    /** For the centre of the drawn chart (unchanged: no name there). */
    birth: { date: when, time: time12, place: input.place },
  };
}
