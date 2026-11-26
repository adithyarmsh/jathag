// The plain planet table (FR-PL-01, D-092): Lagna + the 9 grahas with sign, degree in sign to the
// second, nakshatra, pada, house, dignity, retrograde and combust; the settings, place and clock
// used in small text underneath (FR-SET-03, FR-IN-06). Every value comes from the chart API.

import { forwardRef } from "react";
import type { ChartResponse } from "@jathag/api";
import { clockUsed, fill, formatCoordinate, settingsLine, tableRows } from "@/lib/chart-format";
import type { Messages } from "@/lib/i18n";

/** One cell: "—" gets a screen-reader label, "R" an abbreviation (also used by the transit table). */
export function Cell({ value, t }: { value: string; t: Messages["chart"] }) {
  if (value === t.notApplicable) {
    return (
      <>
        <span aria-hidden="true">{value}</span>
        <span className="sr-only">{t.notApplicableLabel}</span>
      </>
    );
  }
  if (value === t.retrograde) return <abbr title={t.retrogradeLabel} className="no-underline">{value}</abbr>;
  return <>{value}</>;
}

export const PlanetTable = forwardRef<HTMLHeadingElement, { result: ChartResponse; summary: string; t: Messages["chart"] }>(
  function PlanetTable({ result, summary, t }, headingRef) {
    const rows = tableRows(result.chart, t);
    const c = t.columns;
    const columns = [c.sign, c.degree, c.nakshatra, c.pada, c.house, c.dignity, c.retrograde, c.combust];
    return (
      <section
        aria-labelledby="planet-table-title"
        className="card-outer p-4 sm:p-6 lg:col-span-2"
      >
        <h2 id="planet-table-title" ref={headingRef} tabIndex={-1} className="type-h2">
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-muted">{summary}</p>
        <p className="mt-3 text-xs text-muted sm:hidden">{t.scrollHint}</p>
        <div className="relative mt-3 overflow-x-auto" tabIndex={0} role="region" aria-labelledby="planet-table-title">
          <table className="planet-table w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">
              {t.title}: {summary}
            </caption>
            <thead>
              <tr>
                <th scope="col">{c.body}</th>
                {columns.map((col) => (
                  <th key={col} scope="col">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <th scope="row">{r.name}</th>
                  <td>{r.sign}</td>
                  <td className="tabular-nums whitespace-nowrap">{r.degree}</td>
                  <td>{r.nakshatra}</td>
                  <td className="tabular-nums">{r.pada}</td>
                  <td className="tabular-nums">{r.house}</td>
                  <td>
                    <Cell value={r.dignity} t={t} />
                  </td>
                  <td>
                    <Cell value={r.retrograde} t={t} />
                  </td>
                  <td>
                    <Cell value={r.combust} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 space-y-1 border-t border-line pt-4 text-xs leading-relaxed text-muted">
          <p>{t.methodLine}</p>
          <p>{settingsLine(result.settings, t)}</p>
          <p>
            {fill(t.placeLine, {
              lat: formatCoordinate(result.place.lat, "lat"),
              lng: formatCoordinate(result.place.lng, "lng"),
              offset: clockUsed(result.clock, t),
            })}
          </p>
          <p>{fill(t.engineLine, { version: result.engineVersion })}</p>
        </div>
      </section>
    );
  },
);
